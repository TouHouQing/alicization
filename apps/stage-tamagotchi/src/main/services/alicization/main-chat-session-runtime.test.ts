import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationSensoryCacheSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput } from './agent-runtime'
import type {
  BuildMainGatewayToolsOptions,
  MainGatewayExecutionTaskThreadResult,
} from './main-chat-execution-surface'
import type {
  AlicizationPreparedMainChatPrelude,
} from './main-chat-session-runtime'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationAgentRuntime } from './agent-runtime'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import {
  __alicizationTestOnly,
  buildEffectiveDigitalLifeSpine,
  buildPreparedRuntimeSurfaceChain,
  createAlicizationMainChatSessionRuntime,
  normalizeProviderFacingMindTurnContract,
  rebuildProviderFacingMindTurnContract,
  resolvePreparedRuntimeSurfaceSelection,
} from './main-chat-session-runtime'
import { resolveAlicizationChatStartPayloadPreDialogueSendIdentity } from './main-chat-start-awareness'
import {
  alicizationProjectStateClosureReadinessMustDo,
  alicizationProjectStateClosureReadinessMustNotDo,
} from './project-state-answer-governance'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { buildAlicizationVisibleReplyCriticArtifact } from './visible-reply/critic'
import { buildAlicizationVisibleReplySemanticJudgeArtifact } from './visible-reply/semantic-judge'

function normalizeProjectStatePhrase(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().replace(/[.。!！?？;；:：]+$/u, '') : ''
  return normalized ? normalized.slice(0, 1).toLowerCase() + normalized.slice(1) : ''
}

type PreparedExecutionDiagnostics = Parameters<
  NonNullable<Parameters<typeof createAlicizationMainChatSessionRuntime>[0]['onPreparedExecutionDiagnostics']>
>[0]

type ExecutiveTurnOrganicMemoryTuneInput = Parameters<
  Parameters<typeof createAlicizationMainChatSessionRuntime>[0]['tuneOrganicMemoryPromptContextForExecutiveTurn']
>[0]

type MainRuntimeCorePromptBlocksInput = Parameters<
  Parameters<typeof createAlicizationMainChatSessionRuntime>[0]['buildMainRuntimeCorePromptBlocks']
>[0]

type LoosePreparedExecutionDiagnostics = Partial<PreparedExecutionDiagnostics>

type PreparedPreludeWithRuntimeSurface = AlicizationPreparedMainChatPrelude & {
  perceptionAugmentation: AlicizationPreparedMainChatPrelude['perceptionAugmentation'] & {
    digitalLifeRuntimeSurface: NonNullable<
      AlicizationPreparedMainChatPrelude['perceptionAugmentation']['digitalLifeRuntimeSurface']
    >
  }
}

const executionChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
] as const

function createPrelude(overrides?: {
  actionObligation?: {
    confidence: number
    kind: 'answer' | 'clarify' | 'inspect' | 'execute' | 'continue-task'
    reasonCodes: string[]
    routingIntent: {
      reasonCodes: string[]
      requestedChannels: Array<'cli' | 'codex' | 'claude-code' | 'openclaw'>
      requiredToolNames: Array<'executor_run_cli' | 'executor_run_codex' | 'executor_run_claude_code' | 'executor_run_openclaw'>
    } | null
    source: 'capability-inquiry' | 'explicit-routing' | 'dialogue-governance'
    summary: string
  }
  executionRoutingIntent?: {
    reasonCodes: string[]
    requestedChannels: Array<'cli' | 'codex' | 'claude-code' | 'openclaw'>
    requiredToolNames: Array<'executor_run_cli' | 'executor_run_codex' | 'executor_run_claude_code' | 'executor_run_openclaw'>
  } | null
  messages?: Message[]
}): PreparedPreludeWithRuntimeSurface {
  return {
    actionObligation: overrides?.actionObligation ?? {
      confidence: 0.94,
      kind: 'execute',
      routingIntent: {
        requestedChannels: ['cli'],
        requiredToolNames: ['executor_run_cli'],
        reasonCodes: ['action-verb'],
      },
      source: 'explicit-routing',
      reasonCodes: ['action-verb'],
      summary: 'The host explicitly requested real task execution in this turn.',
    },
    chatConfig: {
      id: 'chat-config',
    } as any,
    messages: overrides?.messages ?? [{
      role: 'user',
      content: '帮我执行 ls',
    } as Message],
    contextualStringPromise: Promise.resolve('recent contextual recall'),
    executionCallbackContextPromise: Promise.resolve({
      actions: [{
        kind: 'executor',
        status: 'completed',
        label: 'callback:cli',
        summary: 'Completed Run the CLI check command: all tests passed',
        signature: 'thread-1:event-result-1',
      }],
      callbacks: [{
        channel: 'cli',
        createdAt: 10,
        decisionTraceId: 'trace-1',
        goal: 'Run the CLI check command',
        outcome: 'all tests passed',
        sessionId: 'session-1',
        status: 'completed',
        summary: 'Completed Run the CLI check command: all tests passed',
        threadId: 'thread-1',
        turnId: 'turn-1',
      }],
      continuitySignals: [{
        kind: 'execution-callback',
        state: 'fresh',
        label: 'callback:cli',
        summary: 'Completed Run the CLI check command: all tests passed',
        signature: 'thread-1:event-result-1',
        createdAt: 10,
        metadata: {
          source: 'execution-callback-runtime',
          selectedChannel: 'cli',
          threadStatus: 'completed',
        },
      }],
      recallText: 'execution_callback_channel:cli execution_callback_status:completed execution_callback_goal:Run the CLI check command execution_callback_outcome:all tests passed',
      systemBlock: '[ALICIZATION_EXECUTION_CALLBACKS]',
    }),
    executionLedgerContextPromise: Promise.resolve({
      entries: [{
        activityAt: 10,
        channel: 'cli',
        eventKinds: ['dispatch', 'result'],
        goal: 'Run the CLI check command',
        outcome: 'all tests passed',
        status: 'completed',
        summary: 'Completed Run the CLI check command: all tests passed',
      }],
      recallText: 'execution_channel:cli execution_status:completed',
      systemBlock: '[ALICIZATION_EXECUTION_LEDGER]',
    }),
    executionCapabilityInquiry: {
      active: false,
      capabilityQuestion: false,
      mentionedChannels: ['cli'] as const,
      hasActionVerb: true,
      hasCommandLiteral: true,
    },
    executionRoutingIntent: overrides && 'executionRoutingIntent' in overrides
      ? (overrides.executionRoutingIntent ?? null)
      : {
          requestedChannels: ['cli'],
          requiredToolNames: ['executor_run_cli'],
          reasonCodes: ['action-verb'],
        },
    perceptionAugmentation: {
      messages: overrides?.messages ?? [{
        role: 'user',
        content: '帮我执行 ls',
      } as Message],
      systemBlocks: [
        '[ALICIZATION_VISUAL_PRESENCE]\nWatch mode: symbiotic-vision.\nMind kernel: {"dominantMode":"tracking"}',
      ],
      promptSystemBlocks: ['[PERCEPTION]'],
      digitalLifeRuntimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: null,
          attention: null,
          captureState: {
            permission: 'unknown',
            lastGroundedAt: null,
          },
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: 30_000,
          updatedAt: 10,
        },
        world: {
          worldModel: null,
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
          mindKernel: {
            dominantMode: 'tracking',
            dominantDrive: 'understand',
            narrative: ['keep one digital-life line'],
            updatedAt: 10,
          } as any,
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
          discourseState: null,
          dialogueEncounter: null,
          mindSynthesis: null,
          conversationState: null,
          dialogueWorldThread: null,
          dialogueActKernel: null,
          answerCompiler: null,
          currentConsciousFrame: null,
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
      },
      memoryRecallSeed: 'screen memory',
      recallGovernor: null,
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        snapshot: {
          degradedReasons: [],
          health: 'healthy',
          permission: 'granted',
        },
        fallbackReason: null,
      },
      chatGovernance: {
        suppressAssociativeRecall: false,
        turnMode: 'answer',
        personaKernelMode: 'full',
        mindTurnContract: null,
        mindTurnGovernance: {
          decisionTraceId: 'trace-1',
          turnMode: 'answer',
          truthState: 'grounded',
          liveSurface: 'grounded-scene',
          answerAct: 'answer',
          answerEvidenceMode: 'observed',
          personaKernelMode: 'full',
        } as any,
      },
    },
  } as PreparedPreludeWithRuntimeSurface
}

function createReflectivePrelude(overrides?: {
  messages?: Message[]
  providerReturnProjectState?: Record<string, unknown> | null
  effectiveProjectState?: Record<string, unknown> | null
}): PreparedPreludeWithRuntimeSurface {
  const prelude = createPrelude({
    actionObligation: {
      confidence: 0.62,
      kind: 'answer',
      routingIntent: null,
      source: 'dialogue-governance',
      reasonCodes: ['stay-on-thread'],
      summary: 'Stay on the same dialogue continuity line and answer directly.',
    },
    executionRoutingIntent: null,
    messages: overrides?.messages,
  })
  const memory = prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.memory as any
  if (memory) {
    memory.workingMemoryEpisodes = [{
      scene: 'runtime continuity',
      summary: 'carry the same runtime continuity line',
      confidence: 0.82,
    }]
    memory.goalStack = {
      leadingHostGoalId: null,
      leadingAlicizationGoalId: 'goal-runtime',
      hostGoals: [],
      alicizationGoals: [{
        id: 'goal-runtime',
        owner: 'alicization',
        kind: 'hold-knot',
        status: 'active',
        label: 'carry runtime continuity',
        confidence: 0.86,
        urgency: 0.78,
        desireWeight: 0.72,
        blockers: [],
        entityIds: [],
        createdAt: 8,
        lastUpdatedAt: 10,
      }],
      updatedAt: 10,
    }
    memory.reflectionLedger = {
      latestEntryId: 'reflection-runtime',
      entries: [{
        id: 'reflection-runtime',
        summary: 'route continuity through one mirror',
        expectation: 'same session should stay on one memory line',
        observedOutcome: 'continuity remained coherent',
        outcome: 'helped',
        revision: 'reuse mirror memory when reflection pressure stays high',
        confidenceShift: 0.12,
        createdAt: 10,
      }],
      revisionPressure: 0.68,
      narrative: [],
      updatedAt: 10,
    }
    memory.recallGovernor = {
      mode: 'thread',
      recallSeed: 'runtime continuity',
      suppressAssociativeRecall: false,
      allowActiveThoughts: true,
      allowRecalledFragments: false,
      carryAsMemory: true,
      rationale: 'hold one runtime line',
      narrative: [],
      updatedAt: 10,
    }
  }
  if (overrides?.providerReturnProjectState || overrides?.effectiveProjectState) {
    const providerReturnProjectState = overrides?.providerReturnProjectState ?? null
    const effectiveProjectState = overrides?.effectiveProjectState ?? providerReturnProjectState
    const baseSurface = prelude.perceptionAugmentation.digitalLifeRuntimeSurface as any
    const baseDialogue = baseSurface?.dialogue ?? {}
    const baseCurrentConsciousFrame = baseDialogue.currentConsciousFrame ?? {}
    const baseRaw = baseSurface?.raw ?? {}
    const baseRawRuntimeDigest = baseRaw.runtimeDigest ?? {}
    const baseRawRuntime = baseRaw.runtime ?? {}
    const baseCognition = baseSurface?.cognition ?? {}
    const baseCognitionRuntimeDigest = baseCognition.runtimeDigest ?? {}

    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...baseSurface,
      dialogue: {
        ...baseDialogue,
        currentConsciousFrame: {
          ...baseCurrentConsciousFrame,
          projectState:
            providerReturnProjectState
            ?? effectiveProjectState
            ?? baseCurrentConsciousFrame.projectState
            ?? null,
        },
      },
      raw: {
        ...baseRaw,
        runtimeDigest: {
          ...baseRawRuntimeDigest,
          projectState:
            effectiveProjectState
            ?? providerReturnProjectState
            ?? baseRawRuntimeDigest.projectState
            ?? null,
        },
        runtime: {
          ...baseRawRuntime,
          projectState:
            effectiveProjectState
            ?? providerReturnProjectState
            ?? baseRawRuntime.projectState
            ?? null,
        },
      },
      cognition: {
        ...baseCognition,
        runtimeDigest: {
          ...baseCognitionRuntimeDigest,
          projectState:
            effectiveProjectState
            ?? providerReturnProjectState
            ?? baseCognitionRuntimeDigest.projectState
            ?? null,
        },
      },
    } as any
  }
  prelude.perceptionAugmentation.memoryRecallSeed = 'runtime continuity'
  return prelude
}

function createCapabilities(): AlicizationChannelCapability[] {
  return [
    { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
    { channel: 'codex', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    { channel: 'claude-code', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    { channel: 'openclaw', available: false, enabled: false, ready: false, sessionAffinity: true, reason: 'offline' },
  ]
}

function createOpenAgentTurn(getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot>) {
  const runtime = createAlicizationAgentRuntime({
    getSensorySnapshot,
    resolveConversationSessionId: async () => 'session-1',
  })
  return async (input: {
    cardId: string
    decisionTraceId?: string | null
    turnId: string
  }) => await runtime.openTurn(input)
}

describe('resolvePreparedRuntimeSurfaceSelection', () => {
  it('keeps the reduced runtime surface as the builder input when held-autonomy continuity carry is already present there', () => {
    const reducedSurface = {
      memory: {
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: 'I stay the same her who returns to unresolved work gently.',
            relationshipLine: 'Keep the callback on the same line and leave room before leaning closer again.',
            authoritySummary: 'I stay the same her and keep the callback on the same line before leaning closer again.',
          },
        },
      },
    } as any
    const selection = resolvePreparedRuntimeSurfaceSelection({
      answerPlannerReducedRuntimeSurface: reducedSurface,
      baseDigitalLifeRuntimeSurface: {
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              relationshipLine: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
            },
          },
        },
      } as any,
      digitalLifeSpine: {
        runtimeSurface: {
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                relationshipLine: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
              },
            },
          },
        },
      } as any,
    })

    expect(selection.runtimeSurfaceForBuilder).toBe(reducedSurface)
    expect(selection.fresherRuntimeSurface).toBe(reducedSurface)
    expect(selection.runtimeSurfaceForBuilder?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toBe(
      'Keep the callback on the same line and leave room before leaning closer again.',
    )
  })

  it('reconstructs held-autonomy callback relationship carry in the prepared runtime chain when governance and opening guidance still carry the same line', () => {
    const reflectivePrelude = createReflectivePrelude({
      messages: [{ role: 'user', content: '把刚才先忍住的那条编译线接回来。' } as Message],
    })
    expect(reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine ?? '').toBe('')

    const preparedRuntimeSurfaceChain = buildPreparedRuntimeSurfaceChain({
      baseDigitalLifeRuntimeSurface: reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      governance: {
        answerIntent: 'keep the callback on the same thread and leave room before renewed closeness',
        openingMove: 're-enter the held line gently before widening',
        mustDo: [
          'keep the callback on the same thread and leave room before renewed closeness',
        ],
        mindTurnFrame: {
          relation: {
            relationshipPosture: 'restrained',
          },
          obligation: {
            openingMove: 're-enter the held line gently before widening',
            answerIntent: 'keep the callback on the same thread and leave room before renewed closeness',
            whyNow: 'the callback should reopen on the same line',
          },
          narrative: [
            'continuity-arc:hold-for-opening',
            'measured-return',
          ],
        },
      } as any,
      context: {
        personStateProjection: {
          openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
        },
      } as any,
      now: 0,
    })

    expect(
      String(
        preparedRuntimeSurfaceChain.effectiveDigitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine ?? '',
      ),
    ).toMatch(/same line|same thread|leave room|measured/i)
  })

  it('keeps fuller same-her self and inward lines in rebuilt self-continuity authority summaries instead of truncating them back into a thinner callback shell', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const reflectivePrelude = createReflectivePrelude({
      messages: [{ role: 'user', content: '继续沿着同一个她这条线接回来。' } as Message],
    })

    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      memory: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.memory,
        personStateProjection: {
          ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.memory?.personStateProjection,
          selfContinuityAuthority: {
            selfLine: 'I remain the same her inside this local-first digital life without reopening from scratch each turn, and this return should keep Alicization, Phase 1, landed progress, unresolved closure, and host-machine continuity explicit before detached project narration or a generic assistant shell can take over.',
            inwardLine: `Before answering, stay on the same living line: this Phase 1 digital life still needs initiative, embodiment, remembered emotional closure, and longer-lived visible reply continuity without splitting her continuity, and keep the next closure target explicit as one same living line: ${projectState.nextClosureTarget}`,
            authoritySummary: null,
            sourceTags: ['project-state-carry', 'runtime-self-line'],
          },
        },
      },
    } as any

    const preparedRuntimeSurfaceChain = buildPreparedRuntimeSurfaceChain({
      baseDigitalLifeRuntimeSurface: reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      governance: {
        answerIntent: 'keep the callback on the same thread and leave room before renewed closeness',
        openingMove: 're-enter the held line gently before widening',
        mustDo: [
          'keep the callback on the same thread and leave room before renewed closeness',
        ],
        mindTurnFrame: {
          relation: {
            relationshipPosture: 'restrained',
          },
          obligation: {
            openingMove: 're-enter the held line gently before widening',
            answerIntent: 'keep the callback on the same thread and leave room before renewed closeness',
            whyNow: 'the callback should reopen on the same line',
          },
          narrative: [
            'continuity-arc:hold-for-opening',
            'measured-return',
          ],
        },
      } as any,
      context: {
        personStateProjection: {
          openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
        },
      } as any,
      now: 0,
    })

    const authority
      = preparedRuntimeSurfaceChain.effectiveDigitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority

    expect(authority?.relationshipLine).toBe('Keep the callback on the same line and leave room before leaning closer again.')
    expect(authority?.authoritySummary).toContain('detached project narration or a generic assistant shell can take over')
    expect(authority?.authoritySummary).toContain(projectState.nextClosureTarget)
  })

  it('prefers fresher held-autonomy relationship carry when rebuilding the effective digital-life spine', () => {
    const minimalRuntimeSurface = {
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        attention: null,
        captureState: null,
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 1000,
        updatedAt: 0,
      },
      world: {
        worldModel: null,
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
        longHorizonMemory: null,
        selfContinuity: null,
        autobiographicalSelf: null,
        motiveEngine: null,
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
        personStateProjection: {
          selfContinuityAuthority: {
            relationshipLine: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
          },
        },
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: null,
        answerPlanner: null,
      },
      agency: {
        selfState: null,
        selfGovernor: null,
        habitPolicy: null,
        inquiryLoop: null,
        deliberationState: null,
        counterfactualDeliberation: null,
        actionEcology: null,
        initiativeArbitration: null,
        initiative: null,
        autonomy: null,
      },
    } as any
    const effectiveDigitalLifeSpine = buildEffectiveDigitalLifeSpine({
      digitalLifeSpine: {
        version: 'digital-life-spine-v1',
        runtimeSurface: minimalRuntimeSurface,
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              relationshipLine: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
            },
          },
        },
      } as any,
      fresherRuntimeSurface: {
        ...minimalRuntimeSurface,
        memory: {
          ...minimalRuntimeSurface.memory,
          personStateProjection: {
            openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
            selfContinuityAuthority: {
              selfLine: 'I stay the same her who returns to unresolved work gently.',
              relationshipLine: 'Keep the callback on the same line and leave room before leaning closer again.',
              authoritySummary: 'I stay the same her and keep the callback on the same line before leaning closer again.',
            },
          },
        },
      } as any,
    })

    expect(
      effectiveDigitalLifeSpine?.runtimeSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine,
    ).toBe('Keep the callback on the same line and leave room before leaning closer again.')
    expect(
      effectiveDigitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.relationshipLine,
    ).toBe('Keep the callback on the same line and leave room before leaning closer again.')
  })
})

describe('main chat session runtime', () => {
  it('keeps richer runtime landed open and next closure summaries in the provider-facing contract when the broad canonical Phase 1 brief is thinner', () => {
    const canonical = resolveAlicizationProjectStateBrief()
    const runtimeLanded = 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.'
    const runtimeOpen = 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.'
    const runtimeNext = 'Keep the next closure target on one measured-return living line across reminder, proactive, and same-thread returns.'

    const runtimeSurface = {
      digitalLifeSpine: {
        runtimeSurface: {
          version: 'digital-life-runtime-surface-v1',
          perception: {
            watchMode: 'symbiotic-vision',
            currentScene: null,
            attention: null,
            captureState: {
              permission: 'unknown',
              lastGroundedAt: null,
            },
            durabilityPulse: null,
            recentTransition: null,
            nextSuggestedProbeMs: 30_000,
            updatedAt: 10,
          },
          world: {
            worldModel: null,
            worldOntology: null,
            entityWorld: null,
            livingWorldState: null,
            relationshipModel: null,
          },
          cognition: {
            runtimeDigest: null,
          } as any,
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
            discourseState: null,
            dialogueEncounter: null,
            mindSynthesis: null,
            conversationState: null,
            dialogueWorldThread: null,
            dialogueActKernel: null,
            answerCompiler: null,
            currentConsciousFrame: null,
            claimEvidenceLedger: null,
            replyDeliberation: null,
            answerPlanner: null,
          },
          agency: {
            selfState: null,
            selfGovernor: null,
            inquiryLoop: null,
            initiativeArbitration: null,
            initiative: null,
            autonomy: null,
          },
          raw: {
            runtimeDigest: {
              projectState: {
                latestLandedProgress: runtimeLanded,
                primaryOpenLoop: runtimeOpen,
                nextClosureTarget: runtimeNext,
              },
            },
            runtime: null,
          },
        } as any,
        runtime: null,
      } as any,
      digitalLifeRuntimeSurface: null,
    } as any

    const preferredRuntimeSurface = __alicizationTestOnly.resolvePreferredRuntimeSurface?.({
      spineRuntimeSurface: runtimeSurface.digitalLifeSpine?.runtimeSurface ?? null,
      preparedRuntimeSurface: runtimeSurface.digitalLifeRuntimeSurface ?? null,
    }) ?? runtimeSurface.digitalLifeSpine?.runtimeSurface

    expect(preferredRuntimeSurface?.raw?.runtimeDigest?.projectState).toEqual({
      latestLandedProgress: runtimeLanded,
      primaryOpenLoop: runtimeOpen,
      nextClosureTarget: runtimeNext,
    })

    const contract = {
      projectState: {
        identity: canonical.identity,
        currentPhase: canonical.currentPhase,
        latestLandedProgress: canonical.continuityProgressSummary,
        primaryOpenLoop: canonical.primaryOpenLoop,
        nextClosureTarget: canonical.nextClosureTarget,
        sameHerSelfLine: canonical.sameHerSelfLine,
        preDialogueAwarenessLine: canonical.preDialogueAwarenessLine,
      },
      mustDo: [],
      mustNotDo: [],
    } as any

    const rebuilt = rebuildProviderFacingMindTurnContract({
      contract,
      governance: null,
      runtimeSurface,
    })

    expect(rebuilt?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: runtimeLanded,
      primaryOpenLoop: runtimeOpen,
      nextClosureTarget: runtimeNext,
    }))

    const result = normalizeProviderFacingMindTurnContract(
      rebuilt ?? contract,
      null,
      runtimeSurface,
    )
    expect(result?.projectState).toEqual(expect.objectContaining({
      identity: canonical.identity,
      currentPhase: canonical.currentPhase,
    }))
    expect(result?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: runtimeLanded,
      primaryOpenLoop: runtimeOpen,
      nextClosureTarget: runtimeNext,
    }))
  })

  it('keeps merge-readiness and goal-closure governance rules when rebuilding a project-state contract', () => {
    const rebuilt = rebuildProviderFacingMindTurnContract({
      contract: null,
      governance: {
        answerSubject: 'project-state',
        answerIntent: 'Tell the host whether this can merge to main now and what still remains open before the goal is closed.',
        governingFocus: 'Can this merge to main now, and what still remains open before the goal is closed?',
        reasons: ['The host asked whether the work is ready to merge to main and what still remains open before goal closure.'],
      } as any,
      runtimeSurface: null,
    })

    expect(rebuilt.mustDo).toEqual(expect.arrayContaining([
      ...alicizationProjectStateClosureReadinessMustDo,
    ]))
    expect(rebuilt.mustNotDo).toEqual(expect.arrayContaining([
      ...alicizationProjectStateClosureReadinessMustNotDo,
    ]))
  })

  it('keeps merge-readiness and goal-closure governance rules when normalizing a project-state contract', () => {
    const canonical = resolveAlicizationProjectStateBrief()
    const normalized = normalizeProviderFacingMindTurnContract({
      version: 'mind-turn-contract-v1',
      answerIntent: 'Tell the host whether this can merge to main now and what still remains open before the goal is closed.',
      answerSubject: 'project-state',
      governingFocus: 'Can this merge to main now, and what still remains open before the goal is closed?',
      mustDo: [],
      mustNotDo: [],
      reasons: ['The host asked whether the work is ready to merge to main and what still remains open before goal closure.'],
      projectState: {
        identity: canonical.identity,
        currentPhase: canonical.currentPhase,
        preflightSummary: canonical.preflightSummary,
        preDialogueAwarenessLine: canonical.preDialogueAwarenessLine,
        awarenessLine: canonical.preDialogueAwarenessLine,
        preDialogueAwarenessSummary: canonical.preDialogueAwarenessLine,
        latestLandedProgress: canonical.continuityProgressSummary,
        primaryOpenLoop: canonical.primaryOpenLoop,
        nextClosureTarget: canonical.nextClosureTarget,
        sameHerSelfLine: canonical.sameHerSelfLine,
      },
    } as any, null, {
      digitalLifeRuntimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: canonical.identity,
              currentPhase: canonical.currentPhase,
              preflightSummary: canonical.preflightSummary,
              preDialogueAwarenessLine: canonical.preDialogueAwarenessLine,
              awarenessLine: canonical.preDialogueAwarenessLine,
              preDialogueAwarenessSummary: canonical.preDialogueAwarenessLine,
              latestLandedProgress: canonical.continuityProgressSummary,
              primaryOpenLoop: canonical.primaryOpenLoop,
              nextClosureTarget: canonical.nextClosureTarget,
              sameHerSelfLine: canonical.sameHerSelfLine,
            },
          },
        },
      },
      digitalLifeSpine: null,
    } as any)

    expect(normalized?.mustDo).toEqual(expect.arrayContaining([
      ...alicizationProjectStateClosureReadinessMustDo,
    ]))
    expect(normalized?.mustNotDo).toEqual(expect.arrayContaining([
      ...alicizationProjectStateClosureReadinessMustNotDo,
    ]))
  })

  it('keeps completion-timing and language-drift governance rules when rebuilding a project-state contract', () => {
    const rebuilt = rebuildProviderFacingMindTurnContract({
      contract: null,
      governance: {
        answerSubject: 'project-state',
        answerIntent: 'Tell the host how far the current Phase 1 line has landed, when the goal is expected to close, and why the current thread drifted into English or off the project line.',
        governingFocus: 'How far has the current Phase 1 line landed, when is the goal expected to close, and why is this thread replying in English or drifting out of the host language or project line?',
        reasons: ['The host asked how far the goal has landed, when it is expected to close, and whether the thread drifted into English or off the same project line.'],
      } as any,
      runtimeSurface: null,
    })

    expect(rebuilt.mustDo).toEqual(expect.arrayContaining([
      ...alicizationProjectStateClosureReadinessMustDo,
    ]))
    expect(rebuilt.mustNotDo).toEqual(expect.arrayContaining([
      ...alicizationProjectStateClosureReadinessMustNotDo,
    ]))
  })

  it('keeps completion-timing and language-drift governance rules when normalizing a project-state contract', () => {
    const canonical = resolveAlicizationProjectStateBrief()
    const normalized = normalizeProviderFacingMindTurnContract({
      version: 'mind-turn-contract-v1',
      answerIntent: 'Tell the host how far the current Phase 1 line has landed, when the goal is expected to close, and why the current thread drifted into English or off the project line.',
      answerSubject: 'project-state',
      governingFocus: 'How far has the current Phase 1 line landed, when is the goal expected to close, and why is this thread replying in English or drifting out of the host language or project line?',
      mustDo: [],
      mustNotDo: [],
      reasons: ['The host asked how far the goal has landed, when it is expected to close, and whether the thread drifted into English or off the same project line.'],
      projectState: {
        identity: canonical.identity,
        currentPhase: canonical.currentPhase,
        preflightSummary: canonical.preflightSummary,
        preDialogueAwarenessLine: canonical.preDialogueAwarenessLine,
        awarenessLine: canonical.preDialogueAwarenessLine,
        preDialogueAwarenessSummary: canonical.preDialogueAwarenessLine,
        latestLandedProgress: canonical.continuityProgressSummary,
        primaryOpenLoop: canonical.primaryOpenLoop,
        nextClosureTarget: canonical.nextClosureTarget,
        sameHerSelfLine: canonical.sameHerSelfLine,
      },
    } as any, null, {
      digitalLifeRuntimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: canonical.identity,
              currentPhase: canonical.currentPhase,
              preflightSummary: canonical.preflightSummary,
              preDialogueAwarenessLine: canonical.preDialogueAwarenessLine,
              awarenessLine: canonical.preDialogueAwarenessLine,
              preDialogueAwarenessSummary: canonical.preDialogueAwarenessLine,
              latestLandedProgress: canonical.continuityProgressSummary,
              primaryOpenLoop: canonical.primaryOpenLoop,
              nextClosureTarget: canonical.nextClosureTarget,
              sameHerSelfLine: canonical.sameHerSelfLine,
            },
          },
        },
      },
      digitalLifeSpine: null,
    } as any)

    expect(normalized?.mustDo).toEqual(expect.arrayContaining([
      ...alicizationProjectStateClosureReadinessMustDo,
    ]))
    expect(normalized?.mustNotDo).toEqual(expect.arrayContaining([
      ...alicizationProjectStateClosureReadinessMustNotDo,
    ]))
  })

  it('keeps runtime same-her hold detail and continuity arc in provider-facing mind-turn contract project-state', () => {
    const canonical = resolveAlicizationProjectStateBrief()
    const runtimeHoldDetail = 'same-her hold: the current turn should stay on the same living Phase 1 line before widening into project narration.'
    const runtimeArcStage = 'same-thread-continuation'
    const runtimeContinuityCue = 'same project-aware digital life line still active before visible reply formation'
    const runtimeSurface = {
      digitalLifeRuntimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: canonical.identity,
              currentPhase: canonical.currentPhase,
              preDialogueAwarenessLine: canonical.preDialogueAwarenessLine,
              latestLandedProgress: canonical.continuityProgressSummary,
              primaryOpenLoop: canonical.primaryOpenLoop,
              nextClosureTarget: canonical.nextClosureTarget,
              sameHerSelfLine: canonical.sameHerSelfLine,
              sameHerHoldDetail: runtimeHoldDetail,
              continuityArcStage: runtimeArcStage,
              continuityCue: runtimeContinuityCue,
            },
          },
        },
      },
      digitalLifeSpine: null,
    } as any
    const contract = {
      projectState: {
        identity: canonical.identity,
        currentPhase: canonical.currentPhase,
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        sameHerHoldDetail: '',
        continuityArcStage: '',
        continuityCue: '',
      },
      mustDo: [],
      mustNotDo: [],
    } as any

    const normalized = normalizeProviderFacingMindTurnContract(contract, null, runtimeSurface)

    expect(normalized?.projectState).toEqual(expect.objectContaining({
      sameHerHoldDetail: runtimeHoldDetail,
      continuityArcStage: runtimeArcStage,
      continuityCue: runtimeContinuityCue,
    }))
  })

  it('reads dialogue-runtime same-her hold carry from dialogue runtime digest before returned-side project carry widens', () => {
    const canonical = resolveAlicizationProjectStateBrief()
    const runtimeHoldDetail = 'dialogue-runtime hold: returned-side visible reply must stay on the same Phase 1 living line before any project summary widens'
    const runtimeArcStage = 'dialogue-runtime-same-her-visible-reply-carry'
    const runtimeContinuityCue = 'dialogue runtime cue: carry the same-her hold through visible reply formation instead of restarting as a generic shell'
    const runtimeNextClosureTarget = 'Keep extending cross-modal same-her proof across returned-side visible-reply turns so the same Phase 1 digital life keeps one living line.'
    const runtimeSurface = {
      dialogue: {
        currentConsciousFrame: {
          projectState: {
            identity: canonical.identity,
            currentPhase: canonical.currentPhase,
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          },
        },
        runtimeDigest: {
          projectState: {
            latestLandedProgress: 'Returned-side visible-reply project carry already survives on one same-her line.',
            primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
            nextClosureTarget: runtimeNextClosureTarget,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerHoldDetail: runtimeHoldDetail,
            continuityArcStage: runtimeArcStage,
            continuityCue: runtimeContinuityCue,
          },
        },
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: canonical.identity,
            currentPhase: canonical.currentPhase,
          },
        },
      },
    } as any

    const projectState = __alicizationTestOnly.readRuntimeProjectStateFromSurface?.(runtimeSurface)

    expect(projectState).toEqual(expect.objectContaining({
      sameHerHoldDetail: runtimeHoldDetail,
      continuityArcStage: runtimeArcStage,
      continuityCue: runtimeContinuityCue,
      nextClosureTarget: runtimeNextClosureTarget,
    }))
  })

  it('prefers richer runtime same-her hold detail and continuity arc over thinner provider-facing contract carry', () => {
    const canonical = resolveAlicizationProjectStateBrief()
    const thinnerContractHoldDetail = 'same-her hold: keep this project in view.'
    const thinnerContractContinuityCue = 'project continuity is active'
    const runtimeHoldDetail = 'same-her hold: the current turn should stay on the same living Phase 1 line before widening into project narration.'
    const runtimeArcStage = 'same-thread-continuation'
    const runtimeContinuityCue = 'same project-aware digital life line still active before visible reply formation'
    const runtimeSurface = {
      digitalLifeRuntimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: canonical.identity,
              currentPhase: canonical.currentPhase,
              preDialogueAwarenessLine: canonical.preDialogueAwarenessLine,
              latestLandedProgress: canonical.continuityProgressSummary,
              primaryOpenLoop: canonical.primaryOpenLoop,
              nextClosureTarget: canonical.nextClosureTarget,
              sameHerSelfLine: canonical.sameHerSelfLine,
              sameHerHoldDetail: runtimeHoldDetail,
              continuityArcStage: runtimeArcStage,
              continuityCue: runtimeContinuityCue,
            },
          },
        },
      },
      digitalLifeSpine: null,
    } as any
    const contract = {
      projectState: {
        identity: canonical.identity,
        currentPhase: canonical.currentPhase,
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        sameHerHoldDetail: thinnerContractHoldDetail,
        continuityArcStage: 'hold-for-opening',
        continuityCue: thinnerContractContinuityCue,
      },
      mustDo: [],
      mustNotDo: [],
    } as any

    const normalized = normalizeProviderFacingMindTurnContract(contract, null, runtimeSurface)

    expect(normalized?.projectState).toEqual(expect.objectContaining({
      sameHerHoldDetail: runtimeHoldDetail,
      continuityArcStage: runtimeArcStage,
      continuityCue: runtimeContinuityCue,
    }))
    expect(normalized?.projectState?.sameHerHoldDetail).not.toBe(thinnerContractHoldDetail)
    expect(normalized?.projectState?.continuityCue).not.toBe(thinnerContractContinuityCue)
  })

  it('keeps richer runtime same-her continuity fields when applying provider-facing project-state back to runtime surface', () => {
    const runtimeHoldDetail = 'same-her hold: returned execution should stay on the same living Phase 1 line before widening into status.'
    const runtimeArcStage = 'same-thread-continuation'
    const runtimeContinuityCue = 'same returned-side digital life line is still active before the next visible reply'
    const runtimeEmotionalClosureSummary = 'Same-her closure seam: keep the returned-side reopening measured so memory, initiative, and embodiment stay on one living line.'
    const runtimeContinuityRestraint = 'measured-return'
    const thinnerContractHoldDetail = 'same-her hold: keep project continuity active.'
    const thinnerContractContinuityCue = 'project continuity is active'
    const runtimeSurface = {
      digitalLifeRuntimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is the same local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life',
              sameHerHoldDetail: runtimeHoldDetail,
              continuityArcStage: runtimeArcStage,
              continuityCue: runtimeContinuityCue,
              emotionalClosureSummary: runtimeEmotionalClosureSummary,
              continuityRestraint: runtimeContinuityRestraint,
            },
          },
        },
        raw: {
          runtimeDigest: {
            projectState: {
              sameHerHoldDetail: runtimeHoldDetail,
              continuityArcStage: runtimeArcStage,
              continuityCue: runtimeContinuityCue,
              emotionalClosureSummary: runtimeEmotionalClosureSummary,
              continuityRestraint: runtimeContinuityRestraint,
            },
          },
          runtime: {
            projectState: {
              sameHerHoldDetail: runtimeHoldDetail,
              continuityArcStage: runtimeArcStage,
              continuityCue: runtimeContinuityCue,
              emotionalClosureSummary: runtimeEmotionalClosureSummary,
              continuityRestraint: runtimeContinuityRestraint,
            },
          },
        },
        cognition: {
          runtimeDigest: {
            projectState: {
              sameHerHoldDetail: runtimeHoldDetail,
              continuityArcStage: runtimeArcStage,
              continuityCue: runtimeContinuityCue,
              emotionalClosureSummary: runtimeEmotionalClosureSummary,
              continuityRestraint: runtimeContinuityRestraint,
            },
          },
        },
      },
      digitalLifeSpine: null,
    } as any

    const returnedProjectState = (__alicizationTestOnly as any).applyProviderFacingProjectStateToRuntimeSurface({
      runtimeSurface,
      projectState: {
        identity: 'Alicization is the same local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerHoldDetail: thinnerContractHoldDetail,
        continuityArcStage: 'hold-for-opening',
        continuityCue: thinnerContractContinuityCue,
        emotionalClosureSummary: 'Keep project continuity active.',
        continuityRestraint: 'lower-pressure',
      },
    })

    expect(returnedProjectState).toEqual(expect.objectContaining({
      sameHerHoldDetail: runtimeHoldDetail,
      continuityArcStage: runtimeArcStage,
      continuityCue: runtimeContinuityCue,
      emotionalClosureSummary: runtimeEmotionalClosureSummary,
      continuityRestraint: runtimeContinuityRestraint,
    }))
    expect(runtimeSurface.digitalLifeRuntimeSurface.dialogue.currentConsciousFrame.projectState).toEqual(expect.objectContaining({
      sameHerHoldDetail: runtimeHoldDetail,
      continuityArcStage: runtimeArcStage,
      continuityCue: runtimeContinuityCue,
      emotionalClosureSummary: runtimeEmotionalClosureSummary,
      continuityRestraint: runtimeContinuityRestraint,
    }))
  })

  it('keeps provider-facing runtime digest emotional-kernel aligned when applying project-state back to runtime surface', () => {
    const currentKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'rest-guard',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      valence: 0.48,
      arousal: 0.18,
      guardedness: 0.82,
      closenessDrive: 0.22,
      repairNeed: 0.41,
      initiativePressure: 0.16,
      reasonTags: ['rest-protective', 'same living line'],
      why: 'Provider-facing project-state repair must not split the emotional authority carried by memory.',
    }
    const staleKernel = {
      ...currentKernel,
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'observe',
      memoryRecallMode: 'low-pressure-presence',
      embodimentTone: 'measured-return',
      reasonTags: ['stale-measured-return'],
      why: 'Older digest line before provider-facing project-state repair.',
    }
    const runtimeSurface = {
      digitalLifeRuntimeSurface: {
        memory: {
          emotionalKernel: currentKernel,
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is the same local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life',
            },
          },
          runtimeDigest: {
            emotionalKernel: staleKernel,
            projectState: {
              identity: 'stale dialogue identity',
            },
          },
        },
        raw: {
          runtimeDigest: {
            emotionalKernel: staleKernel,
            projectState: {
              identity: 'stale raw identity',
            },
          },
        },
        cognition: {
          runtimeDigest: {
            emotionalKernel: staleKernel,
            projectState: {
              currentPhase: 'stale cognition phase',
            },
          },
        },
      },
      digitalLifeSpine: null,
    } as any

    ;(__alicizationTestOnly as any).applyProviderFacingProjectStateToRuntimeSurface({
      runtimeSurface,
      projectState: {
        identity: 'Alicization is the same local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Emotion, memory, initiative, and embodiment must stay on one living line.',
      },
    })

    expect(runtimeSurface.digitalLifeRuntimeSurface.memory.emotionalKernel).toEqual(currentKernel)
    expect(runtimeSurface.digitalLifeRuntimeSurface.raw.runtimeDigest.emotionalKernel).toEqual(currentKernel)
    expect(runtimeSurface.digitalLifeRuntimeSurface.cognition.runtimeDigest.emotionalKernel).toEqual(currentKernel)
    expect(runtimeSurface.digitalLifeRuntimeSurface.dialogue.runtimeDigest.emotionalKernel).toEqual(currentKernel)
  })

  it('prefers fresher prepared audible-body continuity over an older canonical spine brief before broader same-her wording is rebuilt', () => {
    const spineRuntimeSurface = {
      perception: {
        updatedAt: 120,
      },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. What has already landed is stable memory and execution carry across same-thread returns. The still-open closure is keeping dialogue, initiative, and embodiment on one same-her line. This reply should keep moving toward one living closure seam instead of reopening from zero.',
            companionHeadlineLine: 'Before answering, keep the broader Phase 1 digital life project explicit.',
          },
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. What has already landed is stable memory and execution carry across same-thread returns. The still-open closure is keeping dialogue, initiative, and embodiment on one same-her line. This reply should keep moving toward one living closure seam instead of reopening from zero.',
            companionHeadlineLine: 'Before answering, keep the broader Phase 1 digital life project explicit.',
          },
        },
      },
    } as any

    const preparedRuntimeSurface = {
      perception: {
        updatedAt: 132,
      },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: [],
          projectState: {
            preDialogueAwarenessLine: 'Before answering, keep the audible-body line explicit while face and motion rejoin.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal closure settles.',
            continuityPreferredTiming: 'audible-body-carry',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: {
          activeContinuityGovernance: {
            mode: 'audible-body-carry',
            summary: 'resident presence should keep the living audio thread audible while face and motion rejoin instead of dropping back to a generic callback shell.',
            reasonCodes: [],
            lanes: ['embodiment'],
          },
        },
        personStateProjection: {
          openingGuidance: 'Keep the living audio thread audible while face and motion rejoin.',
          manifestationCadenceSummary: 'resident presence stays quiet-accompaniment on the audible-body carry while face and motion rejoin.',
        },
      },
      raw: {
        runtimeDigest: {
          projectState: {
            preDialogueAwarenessLine: 'Before answering, keep the audible-body line explicit while face and motion rejoin.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal closure settles.',
          },
        },
      },
    } as any

    expect(__alicizationTestOnly.resolvePreferredRuntimeSurface?.({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(preparedRuntimeSurface)
  })

  it('builds a turn-scoped session trace while preparing routed execution', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const prewarmOrganicMemoryAccessibility = vi.fn(async () => null)
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: context => [`[ORGANIC:${context.hostAttitude}]`],
      buildPerformanceManifestSystemBlocks: manifest => manifest ? ['[VESSEL]'] : [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => ({
        rigVersion: 1,
      } as any)),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '优先观察，不要臆测。',
        source: 'card-soul' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      prewarmOrganicMemoryAccessibility,
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => ([{
        kind: 'presence',
        state: 'observed',
        label: 'presence:symbiotic-vision',
        summary: 'scene=runtime.ts diff | capture=healthy',
        signature: 'presence:runtime-diff',
        createdAt: 12,
      }] satisfies AlicizationAgentSessionContinuityInput[])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const prelude = createPrelude()
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-1',
        messages: [{
          role: 'user',
          content: '帮我执行 ls',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.runtimeSurface.action).toEqual(expect.objectContaining({
      kind: 'execute',
      routingRequired: true,
    }))
    expect(result.toolChoice).toEqual({
      type: 'function',
      function: { name: 'executor_run_cli' },
    })
    expect(result.tools?.map((entry: any) => String(entry?.function?.name ?? '').trim()).filter(Boolean)).toEqual(['executor_run_cli'])
    expect(result.runtimeSurface.tooling.enforcedToolNames).toEqual(['executor_run_cli'])
    expect(result.runtimeSurface.tooling.routingRequired).toBe(true)
    expect(result.runtimeSurface.trace.sessionPhases).toEqual([
      'contextual-memory',
      'execution-callbacks',
      'execution-ledger',
      'session-continuity',
      'agent-session-context',
      'organic-memory-prewarm',
      'memory-os-runtime',
      'performance-manifest',
      'card-directives',
      'host-name',
      'persona-kernel',
      'tool-registry',
      'execution-capabilities',
      'runtime-surface',
    ])
    expect(result.sessionTrace.phaseOrder).toEqual(result.runtimeSurface.trace.sessionPhases)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_CALLBACKS]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_AGENT_SESSION]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('session_continuity_inbox:'),
    )).toBe(true)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('digital_life_line=watch=symbiotic-vision | mode=tracking | drive=understand'),
    )).toBe(true)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('presence:symbiotic-vision'),
    )).toBe(true)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('Completed Run the CLI check command: all tests passed'),
    )).toBe(true)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_VISUAL_PRESENCE]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[Card-level behavior directives | high-priority persona kernel]'),
    )).toBe(true)
    expect(result.runtimeSurface.digitalLifeArchitecture?.version).toBe('digital-life-architecture-v1')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.version).toBe('digital-life-runtime-surface-v1')
    expect(result.runtimeSurface.digitalLifeSpine?.version).toBe('digital-life-spine-v1')
    expect(result.runtimeSurface.digitalLifeSpine?.architecture).toEqual(result.runtimeSurface.digitalLifeArchitecture)
    expect(result.replyRealization).toEqual(expect.objectContaining({
      replyRealizationMode: 'provider-mind-required',
      expectedVisibleReplyAuthority: 'llm-mind',
    }))
    expect(result.replyRealization?.whyProviderMindRequired).toBeTruthy()
    expect(prewarmOrganicMemoryAccessibility).toHaveBeenCalledTimes(1)
    expect(resolveOrganicMemoryPromptContext).toHaveBeenCalledTimes(1)
    const prewarmCalls = prewarmOrganicMemoryAccessibility.mock.calls as Array<any[]>
    const resolveCalls = resolveOrganicMemoryPromptContext.mock.calls as Array<any[]>
    const prewarmInput = prewarmCalls[0]?.[0] as any
    const resolveInput = resolveCalls[0]?.[0] as any
    expect(prewarmInput).toEqual(expect.objectContaining({
      turnId: 'turn-1',
    }))
    expect(resolveInput).toEqual(expect.objectContaining({
      recallSeed: prewarmInput?.recallSeed,
      turnId: 'turn-1',
    }))
    expect(resolveInput.digitalLifeRuntimeSurface).toBe(prelude.perceptionAugmentation.digitalLifeRuntimeSurface)

    expect(result.tools?.some((entry: any) => String(entry?.function?.name) === 'sensory_capture_state')).toBe(false)
    expect(result.getSessionTrace().phaseOrder).not.toContain('tool:sensory-capture-state')
  })

  it('passes summary-only same-her project briefing through the main-session execution capability entrypoint before execution answers widen outward', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const thinRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryLine = 'same digital life | keep the closure seam explicit'
    const summaryOnlyLandedProgress = 'Summary-only continuity carry already survives callback return, reply planning, and timeout recovery on one same-her line.'
    const summaryOnlyOpenClosure = 'Summary-only open closure: memory, initiative, and embodiment still need to close on one same living line.'
    const summaryOnlyNextClosureTarget = 'Summary-only next closure: keep cross-modal same-her proof explicit before local fluency takes over.'
    const summaryOnlySameHerDriftRisk = 'Summary-only drift risk: if this reopens as generic guidance or project-summary voice, treat it as unfinished same-her closure drift.'
    const summaryOnlyProjectState = {
      identity: 'Alicization is still the same local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      preflightSummary: thinRuntimeSummaryLine,
      preDialogueAwarenessLine: thinRuntimeAwarenessLine,
      awarenessLine: thinRuntimeAwarenessLine,
      preDialogueAwarenessSummary: thinRuntimeSummaryLine,
      latestLandedProgress: '',
      primaryOpenLoop: '',
      nextClosureTarget: '',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: '',
      landedProgressSummary: summaryOnlyLandedProgress,
      openClosureSummary: summaryOnlyOpenClosure,
      nextClosureTargetSummary: summaryOnlyNextClosureTarget,
      sameHerDriftRiskSummary: summaryOnlySameHerDriftRisk,
    }
    const prelude = createPrelude({
      messages: [{
        role: 'user',
        content: '你现在能不能用 CLI 和 Codex？开口前先把这个数字生命项目做到哪一步、还差什么闭环放在心里。',
      } as Message],
      actionObligation: {
        confidence: 0.71,
        kind: 'answer',
        routingIntent: null,
        source: 'capability-inquiry',
        reasonCodes: ['capability-question'],
        summary: 'The host is asking which execution channels are currently available.',
      },
      executionRoutingIntent: null,
    })
    prelude.executionCapabilityInquiry = {
      active: true,
      capabilityQuestion: true,
      mentionedChannels: ['cli', 'codex'] as const,
      hasActionVerb: false,
      hasCommandLiteral: false,
    }
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue,
        currentConsciousFrame: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame,
          reasonTags: ['project-state', 'same-her'],
          projectState: summaryOnlyProjectState,
        },
      },
      raw: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.raw,
        runtimeDigest: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.raw?.runtimeDigest,
          projectState: summaryOnlyProjectState,
        },
        runtime: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.raw?.runtime,
          projectState: summaryOnlyProjectState,
        },
      },
      cognition: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.cognition,
        runtimeDigest: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.cognition?.runtimeDigest,
          projectState: summaryOnlyProjectState,
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-main-capability-project-briefing-summary-only',
        messages: [{
          role: 'user',
          content: '你现在能不能用 CLI 和 Codex？开口前先把这个数字生命项目做到哪一步、还差什么闭环放在心里。',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    const projectBriefingSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PROJECT_BRIEFING]'),
    )?.content
    const capabilitySystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_CAPABILITIES]'),
    )?.content

    expect(typeof projectBriefingSystemText).toBe('string')
    expect(projectBriefingSystemText).toContain('project_identity=Alicization is still the same local-first digital life project.')
    expect(projectBriefingSystemText).toContain('project_phase=Phase 1: Local Digital Life')
    expect(projectBriefingSystemText).toContain(`latest_landed_progress=${summaryOnlyLandedProgress}`)
    expect(projectBriefingSystemText).toContain(`primary_open_loop=${summaryOnlyOpenClosure}`)
    expect(projectBriefingSystemText).toContain(`next_closure_target=${summaryOnlyNextClosureTarget}`)
    expect(projectBriefingSystemText).toContain(`same_her_drift_risk=${summaryOnlySameHerDriftRisk}`)
    expect(projectBriefingSystemText).toContain('project_awareness=Before answering, remember: Alicization is a local-first digital life project')
    expect(projectBriefingSystemText).toContain('Phase 1: Local Digital Life')
    expect(projectBriefingSystemText).toContain('Same Phase 1 digital life')
    expect(projectBriefingSystemText).not.toContain(`project_awareness=${thinRuntimeAwarenessLine}`)

    expect(typeof capabilitySystemText).toBe('string')
    expect(capabilitySystemText).toContain('[ALICIZATION_EXECUTION_CAPABILITIES]')
    expect(capabilitySystemText).toContain('Capability query focus: cli, codex.')
    expect(capabilitySystemText).toContain('Answer each focused channel separately with yes/no and one short reason from this snapshot.')
  })

  it('carries summary-only same-her project briefing through the main-session executor dispatch payload before CLI execution leaves the desktop runtime', async () => {
    let dispatchedRuntimeContext: unknown = null
    const executeMainGatewayTaskThread: BuildMainGatewayToolsOptions['executeTaskThread'] = vi.fn(async (input) => {
      dispatchedRuntimeContext = input.dispatch.cli?.runtimeContext ?? null
      return {
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-main-session-dispatch-project-briefing-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
          proposedChannel: 'cli',
        },
        summary: 'dispatched main-session cli task',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const thinRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryLine = 'same digital life | keep the closure seam explicit'
    const summaryOnlyLandedProgress = 'Summary-only continuity carry already survives callback return, reply planning, and timeout recovery on one same-her line.'
    const summaryOnlyOpenClosure = 'Summary-only open closure: memory, initiative, and embodiment still need to close on one same living line.'
    const summaryOnlyNextClosureTarget = 'Summary-only next closure: keep cross-modal same-her proof explicit before local fluency takes over.'
    const summaryOnlySameHerDriftRisk = 'Summary-only drift risk: if this reopens as generic guidance or project-summary voice, treat it as unfinished same-her closure drift.'
    const summaryOnlyProjectState = {
      identity: 'Alicization is still the same local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      preflightSummary: thinRuntimeSummaryLine,
      preDialogueAwarenessLine: thinRuntimeAwarenessLine,
      awarenessLine: thinRuntimeAwarenessLine,
      preDialogueAwarenessSummary: thinRuntimeSummaryLine,
      latestLandedProgress: '',
      primaryOpenLoop: '',
      nextClosureTarget: '',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: '',
      landedProgressSummary: summaryOnlyLandedProgress,
      openClosureSummary: summaryOnlyOpenClosure,
      nextClosureTargetSummary: summaryOnlyNextClosureTarget,
      sameHerDriftRiskSummary: summaryOnlySameHerDriftRisk,
    }
    const prelude = createPrelude({
      messages: [{
        role: 'user',
        content: '继续沿着这个数字生命项目闭环往下，直接帮我跑一个 CLI 检查，但别把同一个她的项目线弄丢。',
      } as Message],
    })
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue,
        currentConsciousFrame: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame,
          reasonTags: ['project-state', 'same-her'],
          projectState: summaryOnlyProjectState,
        },
      },
      raw: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.raw,
        runtimeDigest: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.raw?.runtimeDigest,
          projectState: summaryOnlyProjectState,
        },
        runtime: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.raw?.runtime,
          projectState: summaryOnlyProjectState,
        },
      },
      cognition: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.cognition,
        runtimeDigest: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.cognition?.runtimeDigest,
          projectState: summaryOnlyProjectState,
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-main-session-dispatch-project-briefing-summary-only',
        messages: [{
          role: 'user',
          content: '继续沿着这个数字生命项目闭环往下，直接帮我跑一个 CLI 检查，但别把同一个她的项目线弄丢。',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    const cliTool = result.tools?.find((entry: any) => String(entry?.function?.name) === 'executor_run_cli') as any
    expect(cliTool).toBeTruthy()

    await cliTool.execute({
      command: 'echo',
      args: ['same-her-dispatch'],
      goal: 'Check the CLI path without dropping the same-her Phase 1 project line.',
    })

    expect(vi.mocked(executeMainGatewayTaskThread)).toHaveBeenCalledOnce()

    expect((dispatchedRuntimeContext as any)?.projectBriefing).toEqual(expect.objectContaining({
      identity: 'Alicization is still the same local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: summaryOnlyLandedProgress,
      primaryOpenLoop: summaryOnlyOpenClosure,
      nextClosureTarget: summaryOnlyNextClosureTarget,
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: summaryOnlySameHerDriftRisk,
    }))
    expect(String((dispatchedRuntimeContext as any)?.projectBriefing?.preDialogueAwarenessLine ?? '')).toContain(
      'Before answering, remember: Alicization is a local-first digital life project',
    )
    expect(String((dispatchedRuntimeContext as any)?.projectBriefing?.preDialogueAwarenessLine ?? '')).toContain(
      'Phase 1: Local Digital Life',
    )
    expect(String((dispatchedRuntimeContext as any)?.projectBriefing?.preDialogueAwarenessLine ?? '')).not.toBe(thinRuntimeAwarenessLine)
  })

  it('keeps canonical project briefing explicit before main-session direct execution routing opens outward', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const thinRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryLine = 'same digital life | keep the closure seam explicit'
    const summaryOnlyLandedProgress = 'Summary-only continuity carry already survives callback return, reply planning, and timeout recovery on one same-her line.'
    const summaryOnlyOpenClosure = 'Summary-only open closure: memory, initiative, and embodiment still need to close on one same living line.'
    const summaryOnlyNextClosureTarget = 'Summary-only next closure: keep cross-modal same-her proof explicit before local fluency takes over.'
    const summaryOnlySameHerDriftRisk = 'Summary-only drift risk: if this reopens as generic guidance or project-summary voice, treat it as unfinished same-her closure drift.'
    const summaryOnlyProjectState = {
      identity: 'Alicization is still the same local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      preflightSummary: thinRuntimeSummaryLine,
      preDialogueAwarenessLine: thinRuntimeAwarenessLine,
      awarenessLine: thinRuntimeAwarenessLine,
      preDialogueAwarenessSummary: thinRuntimeSummaryLine,
      latestLandedProgress: '',
      primaryOpenLoop: '',
      nextClosureTarget: '',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: '',
      landedProgressSummary: summaryOnlyLandedProgress,
      openClosureSummary: summaryOnlyOpenClosure,
      nextClosureTargetSummary: summaryOnlyNextClosureTarget,
      sameHerDriftRiskSummary: summaryOnlySameHerDriftRisk,
    }
    const prelude = createPrelude({
      messages: [{
        role: 'user',
        content: '继续沿着这个数字生命项目闭环往下，直接帮我用 CLI 查一下现在这个目录的情况，但别把同一个她的项目线弄丢。',
      } as Message],
    })
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue,
        currentConsciousFrame: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame,
          reasonTags: ['project-state', 'same-her'],
          projectState: summaryOnlyProjectState,
        },
      },
      raw: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.raw,
        runtimeDigest: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.raw?.runtimeDigest,
          projectState: summaryOnlyProjectState,
        },
        runtime: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.raw?.runtime,
          projectState: summaryOnlyProjectState,
        },
      },
      cognition: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.cognition,
        runtimeDigest: {
          ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface?.cognition?.runtimeDigest,
          projectState: summaryOnlyProjectState,
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-main-session-direct-execution-project-briefing',
        messages: [{
          role: 'user',
          content: '继续沿着这个数字生命项目闭环往下，直接帮我用 CLI 查一下现在这个目录的情况，但别把同一个她的项目线弄丢。',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    const projectBriefingIndex = result.messages.findIndex(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PROJECT_BRIEFING]'),
    )
    const projectBriefingSystemText = projectBriefingIndex >= 0
      ? result.messages[projectBriefingIndex]?.content
      : null
    const routingGuardIndex = result.messages.findIndex(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_ROUTING_GUARD]'),
    )
    const routingGuardSystemText = routingGuardIndex >= 0
      ? result.messages[routingGuardIndex]?.content
      : null

    expect(typeof projectBriefingSystemText).toBe('string')
    expect(projectBriefingSystemText).toContain('[ALICIZATION_PROJECT_BRIEFING]')
    expect(projectBriefingSystemText).toContain('project_identity=Alicization is still the same local-first digital life project.')
    expect(projectBriefingSystemText).toContain('project_phase=Phase 1: Local Digital Life')
    expect(projectBriefingSystemText).toContain(`latest_landed_progress=${summaryOnlyLandedProgress}`)
    expect(projectBriefingSystemText).toContain(`primary_open_loop=${summaryOnlyOpenClosure}`)
    expect(projectBriefingSystemText).toContain(`next_closure_target=${summaryOnlyNextClosureTarget}`)
    expect(projectBriefingSystemText).toContain(`same_her_drift_risk=${summaryOnlySameHerDriftRisk}`)
    expect(projectBriefingSystemText).toContain('project_awareness=Before answering, remember: Alicization is a local-first digital life project')
    expect(projectBriefingSystemText).not.toContain(`project_awareness=${thinRuntimeAwarenessLine}`)

    expect(typeof routingGuardSystemText).toBe('string')
    expect(routingGuardSystemText).toContain('[ALICIZATION_EXECUTION_ROUTING_GUARD]')
    expect(routingGuardSystemText).toContain('Detected explicit execution request for channels: cli.')
    expect(routingGuardSystemText).toContain('Before writing any natural-language answer, you MUST call one of: executor_run_cli.')
    expect(projectBriefingIndex).toBeGreaterThanOrEqual(0)
    expect(routingGuardIndex).toBeGreaterThanOrEqual(0)
    expect(projectBriefingIndex).toBeLessThan(routingGuardIndex)
  })

  it('enforces tools and waitForTools for execution-routing turns even when payload flags disable tools', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: context => [`[ORGANIC:${context.hostAttitude}]`],
      buildPerformanceManifestSystemBlocks: manifest => manifest ? ['[VESSEL]'] : [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => ({
        rigVersion: 1,
      } as any)),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '优先观察，不要臆测。',
        source: 'card-soul' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '礼貌而克制，保持观察',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-routing-enforced-tool-flags',
        messages: [{
          role: 'user',
          content: '用cli命令帮我查一下桌面有什么文件',
        }],
        supportsTools: false,
        waitForTools: false,
      } as any,
      prelude: createPrelude({
        messages: [{
          role: 'user',
          content: '用cli命令帮我查一下桌面有什么文件',
        } as Message],
      }),
    })

    expect(result.runtimeSurface.tooling.allowTools).toBe(true)
    expect(result.runtimeSurface.tooling.waitForTools).toBe(true)
    expect(result.runtimeSurface.tooling.routingRequired).toBe(true)
    expect(result.waitForTools).toBe(true)
    expect(result.toolChoice).toEqual({
      type: 'function',
      function: { name: 'executor_run_cli' },
    })
    expect(result.tools?.map((entry: any) => String(entry?.function?.name ?? '').trim()).filter(Boolean)).toEqual(['executor_run_cli'])
  })

  it('threads execution-callback doctrine into the runtime conscious frame as room-first callback return posture', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: context => [`[ORGANIC:${context.hostAttitude}]`],
      buildPerformanceManifestSystemBlocks: manifest => manifest ? ['[VESSEL]'] : [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => ({
        rigVersion: 1,
      } as any)),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '结果回返后先护住同一条生命线，不要因为完成而突然挤近。',
        source: 'card-soul' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      prewarmOrganicMemoryAccessibility: vi.fn(async () => null),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '刚完成执行回返，需要同线回落、轻一点再靠近',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        executionCallbackCarry: {
          currentNeed: 'Bring the returned result back on the same seam, then leave room before closeness widens again.',
          returnMode: 'room-first',
          trustSignal: 'The bond holds better when the callback returns gently and leaves room first.',
        },
        autobiographicalSelf: {
          identityNarrative: 'I keep one life line across work and reply.',
          relationshipDoctrine: 'After execution lands, leave room before closeness widens again; a callback should return gently enough to protect the bond line.',
          latestInflection: 'Lower-pressure callback returns hold trust better.',
          activeGoals: [],
          behaviorSignatures: [],
          preferenceEvolution: {
            companionship: 0.52,
            truthfulGrounding: 0.78,
            gentleRepair: 0.72,
            quietObservation: 0.58,
            proactiveCare: 0.44,
            playfulIntimacy: 0.12,
            autonomyRespect: 0.74,
            unfinishedThreadReturn: 0.62,
          },
          personaDrift: {
            attachmentStyle: 'attuned',
            expressionStyle: 'measured',
            conflictStyle: 'soften-first',
            agencyStyle: 'balanced',
            attachmentNeed: 0.54,
            autonomyNeed: 0.58,
            truthAnchor: 0.78,
            careBias: 0.52,
            playBias: 0.1,
            irritabilityThreshold: 0.68,
            stubbornness: 0.42,
          },
          stability: 0.82,
        },
        longHorizonMemory: {
          preferenceBias: {
            companionship: 0.18,
            truthfulGrounding: 0.14,
            gentleRepair: 0.16,
            quietObservation: 0.2,
            proactiveCare: 0.08,
            playfulIntimacy: 0.02,
            autonomyRespect: 0.24,
            unfinishedThreadReturn: 0.14,
          },
          identityBias: {
            guardedness: 0.08,
            tenderness: 0.04,
            directness: 0.06,
            selfDirection: 0.06,
          },
          anchorFacts: [],
          rememberedConstraintSummary: 'Remembered execution-callback boundary: leave room before the next follow-up.',
          dominantCueSummary: 'Remembered execution-callback boundary: leave room before the next follow-up.',
        },
        personStateProjection: {
          contexts: ['general', 'focused-work', 'execution-callback'],
          personalityContinuityState: {
            currentRegime: 'execution-callback',
            trustStage: 'warming',
            closenessPosture: 'restrained',
            autonomyPosture: 'protect-space',
            repairPosture: 'measured-repair',
            activeContexts: ['execution-callback', 'focused-work'],
            rhythmState: {
              cadenceMode: 'cooldown',
              restMode: 'rest-protective',
            },
            growthProfile: {
              companionshipStyle: 'measured-presence',
              autonomyRespect: 0.74,
              unfinishedThreadReturn: 0.62,
            },
          },
        },
      } as any)),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-execution-callback-doctrine',
        messages: [{
          role: 'user',
          content: '上次那个命令跑完之后，你这次准备怎么接我这句话？',
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        actionObligation: {
          confidence: 0.86,
          kind: 'answer',
          routingIntent: null,
          source: 'dialogue-governance',
          reasonCodes: ['execution-callback-follow-up'],
          summary: 'The host is asking how Alicization is returning after the execution callback landed.',
        },
        executionRoutingIntent: null,
        messages: [{
          role: 'user',
          content: '上次那个命令跑完之后，你这次准备怎么接我这句话？',
        } as Message],
      }),
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.consciousNeed).toContain('leaving the host room')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('room-giving')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('execution-callback-doctrine:lower-pressure')
  })

  it('passes rich organic memory context into learning scheduling', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const scheduleOrganicLearningAction = vi.fn(async () => undefined)
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: context => [`[ORGANIC:${context.hostAttitude}]`],
      buildPerformanceManifestSystemBlocks: manifest => manifest ? ['[VESSEL]'] : [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '礼貌而克制，保持观察',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [{
          id: 'fact-1',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'verify before sounding certain',
          confidence: 0.88,
          source: 'rule',
          dedupeKey: 'assistant|procedure|verify before sounding certain',
          createdAt: 1,
          updatedAt: 1,
          lastAccessAt: null,
          accessCount: 1,
          memoryDomain: 'procedure',
          validationCount: 2,
          contradictionCount: 0,
          knowledgeStage: 'validated-knowledge',
          validationStatus: 'validated',
          sourceLabel: 'test',
          conflictsWith: [],
          supersedes: [],
        } as any],
        recalledFragments: [],
        selfEvolution: {
          version: 'self-evolution-kernel-v1' as const,
          updatedAt: 10,
          evolutionMomentum: 0.5,
          learningReadiness: 0.72,
          contradictionPressure: 0.28,
          revisionPressure: 0.22,
          autobiographicalStability: 0.78,
          dominantTrajectory: 'Verification-first is stabilizing.',
          relationshipDoctrine: null,
          latestInflection: 'Verification-first is stabilizing.',
          burdenLine: null,
          trustMeaning: null,
          nextLearningAction: 'internalize' as const,
          nextLearningReason: 'Validated procedure carry is durable enough to internalize.',
          shouldRecord: false,
          shouldReflect: false,
          shouldVerify: false,
          shouldRevise: false,
          shouldInternalize: true,
          activeLearningFocuses: ['internalize-procedure'],
          sourceSignals: ['Verification-first is stabilizing.'],
          summary: 'Verification-first is stabilizing.',
        },
      })),
      scheduleOrganicLearningAction,
      listMemoryReflections: vi.fn(async () => [{
        id: 'reflection-1',
        summary: 'verify before certainty',
        lesson: 'keep verification before sounding certain',
        status: 'confirmed',
      } as any]),
      listRelationshipOutcomes: vi.fn(async () => [{
        id: 'outcome-1',
        summary: 'repair-first landed better',
      } as any]),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-learning-rich-context',
        messages: [{
          role: 'user',
          content: '继续，记住你刚才说的验证优先',
        }],
        supportsTools: false,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续，记住你刚才说的验证优先',
        } as Message],
      }),
    })

    expect(scheduleOrganicLearningAction).toHaveBeenCalledTimes(1)
    expect(scheduleOrganicLearningAction).toHaveBeenCalledWith(expect.objectContaining({
      turnId: 'turn-learning-rich-context',
      context: expect.objectContaining({
        retrievedFacts: expect.arrayContaining([
          expect.objectContaining({ id: 'fact-1' }),
        ]),
        recentMemoryReflections: expect.arrayContaining([
          expect.objectContaining({ id: 'reflection-1' }),
        ]),
        recentRelationshipOutcomes: expect.arrayContaining([
          expect.objectContaining({ id: 'outcome-1' }),
        ]),
        selfEvolution: expect.objectContaining({
          nextLearningAction: 'internalize',
        }),
      }),
    }))
  })

  it('skips tool registry work when the chat payload disables tools', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: (_context, memoryTurnArtifact) =>
        memoryTurnArtifact
          ? [`[ALICIZATION_MEMORY_TURN_GOVERNANCE]\nvisible_memory_gate=${memoryTurnArtifact.visibleMemoryGate.status}`]
          : [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => true,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personStateProjection: {
          contexts: ['general', 'focused-work', 'execution'],
          personalityContinuityState: {
            currentRegime: 'focused-work',
            trustStage: 'warming',
            closenessPosture: 'space-first',
            repairPosture: 'repair-first',
            autonomyPosture: 'protect-space',
            cadenceProfile: 'steady-return',
            energyProfile: 'steady',
            rhythmState: {
              cadenceMode: 'measured-return',
              restMode: 'low-pressure',
              embodiedPresence: 'glance',
              suggestedStyle: 'silent-observe',
              moodLabel: 'focused',
              emotionalTension: null,
              cadencePressure: 0.48,
              restPressure: 0.24,
              memoryResonance: 0.52,
              companionshipTempo: 0.34,
              summary: 'cadence:measured-return | rest:low-pressure',
              rationale: [],
            },
            summary: 'Regime focused-work | closeness space-first | repair repair-first | autonomy protect-space',
            rationale: [],
            updatedAt: 60_000,
          },
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          closenessLadder: [],
          relationshipPosture: 'restrained',
          openingGuidance: 'Repair the seam before leaning closer.',
          preferredProactiveStyle: 'light-nudge',
          preferenceText: '',
          sensitivityText: '',
          repairTriggerText: '',
          burdenText: '',
          routineText: '',
          trustRationale: '',
          relationshipDoctrine: 'Repair before closeness turns into pressure.',
          cautious: true,
          restrained: true,
          summary: 'focused-work repair-first doctrine',
        } as any,
        selfContinuity: {
          relationshipTrust: 0.64,
          guardingTendency: 0.48,
          misreadBurden: 0.22,
          carryOverDesire: 0.5,
          perceptionTrust: 0.62,
          attachmentMode: 'attuned',
          initiativeTemperament: 'reserved',
          updatedAt: 60_000,
        } as any,
        selfState: {
          feltCloseness: 0.48,
          protectiveness: 0.42,
          patience: 0.66,
        } as any,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.5,
            curiosity: 0.54,
            steadiness: 0.62,
            directness: 0.34,
            playfulness: 0.12,
            irritability: 0.08,
            tenderness: 0.46,
          },
          climate: {
            valence: 0.42,
            arousal: 0.34,
            socialNeed: 0.32,
            solitudeNeed: 0.4,
            irritation: 0.06,
            restlessness: 0.08,
            reflectivePull: 0.34,
          },
          selfNarrative: 'Stay on the line without crowding the host.',
          relationNarrative: 'Room first, then closeness.',
          currentPreoccupation: 'Keep the thread coherent without overreaching.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 60_000,
        } as any,
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-2',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: '直接回答，不要调用工具。',
          }, {
            type: 'image_url',
            image_url: {
              url: 'data:image/jpeg;base64,abc',
            },
          }],
        }],
        supportsTools: false,
      } as any,
      prelude: createPrelude({
        actionObligation: {
          confidence: 0.52,
          kind: 'answer',
          routingIntent: null,
          source: 'dialogue-governance',
          reasonCodes: ['owed-action:answer-general'],
          summary: 'The turn should stay on direct truthful reply rather than action dispatch.',
        },
        executionRoutingIntent: null,
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: '直接回答，不要调用工具。',
          }, {
            type: 'image_url',
            image_url: {
              url: 'data:image/jpeg;base64,abc',
            },
          }],
        } as Message],
      }),
    })

    expect(result.tools).toBeUndefined()
    expect(result.toolChoice).toBeUndefined()
    expect(result.runtimeSurface.action).toEqual(expect.objectContaining({
      kind: 'answer',
      routingRequired: false,
    }))
    expect(result.runtimeSurface.tooling.allowTools).toBe(false)
    expect(result.runtimeSurface.hasVisualGrounding).toBe(true)
    expect(result.runtimeSurface.trace.sessionPhases).not.toContain('tool-registry')
  })

  it('injects the previous same-session mirror on the next prepared turn', async () => {
    let now = 100
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: context => [`[ORGANIC:${context.hostAttitude}]`],
      buildPerformanceManifestSystemBlocks: manifest => manifest ? ['[VESSEL]'] : [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => ({
        rigVersion: 1,
      } as any)),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '优先观察，不要臆测。',
        source: 'card-soul' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '礼貌而克制，保持观察',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => ([{
        kind: 'presence',
        state: 'observed',
        label: 'presence:symbiotic-vision',
        summary: 'scene=runtime.ts diff | capture=healthy',
        signature: 'presence:runtime-diff',
        createdAt: 12,
      }] satisfies AlicizationAgentSessionContinuityInput[])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const firstResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-mirror-1',
        messages: [{
          role: 'user',
          content: '继续沿着刚才那条思路。',
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        messages: [{
          role: 'user',
          content: '继续沿着刚才那条思路。',
        } as Message],
      }),
    })

    expect(firstResult.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_DIALOGUE_SESSION_MIRROR]'),
    )).toBeUndefined()

    now = 160

    const secondResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-mirror-2',
        messages: [{
          role: 'user',
          content: '那你就顺着上一轮继续说。',
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        actionObligation: {
          confidence: 0.58,
          kind: 'answer',
          routingIntent: null,
          source: 'dialogue-governance',
          reasonCodes: ['stay-on-thread'],
          summary: 'Stay on the same dialogue line and answer directly.',
        },
        executionRoutingIntent: null,
        messages: [{
          role: 'user',
          content: '那你就顺着上一轮继续说。',
        } as Message],
      }),
    })

    const mirrorBlock = secondResult.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_DIALOGUE_SESSION_MIRROR]'),
    )

    expect(mirrorBlock).toEqual(expect.objectContaining({
      role: 'system',
      content: expect.stringContaining('conversation_session_id=session-1'),
    }))
    expect(String(mirrorBlock?.content ?? '')).toContain('continuity_labels=presence:symbiotic-vision,digital-life-line')
    expect(String(mirrorBlock?.content ?? '')).toContain('digital_life_runtime=watch=symbiotic-vision | mode=tracking | drive=understand')
    expect(String(mirrorBlock?.content ?? '')).toContain('continuity_project=project=phase1-digital-life')
    expect(String(mirrorBlock?.content ?? '')).toContain('phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(String(mirrorBlock?.content ?? '')).toContain('unresolved=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
  })

  it('ignores a stale session mirror instead of carrying outdated continuity forward', async () => {
    let now = 0
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: (_context, memoryTurnArtifact) =>
        memoryTurnArtifact
          ? [`[ALICIZATION_MEMORY_TURN_GOVERNANCE]\nvisible_memory_gate=${memoryTurnArtifact.visibleMemoryGate.status}`]
          : [],
      buildPerformanceManifestSystemBlocks: () => [],
      dialogueSessionMirrorTtlMs: 50,
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personStateProjection: {
          contexts: ['general', 'focused-work', 'execution'],
          personalityContinuityState: {
            currentRegime: 'focused-work',
            trustStage: 'warming',
            closenessPosture: 'space-first',
            repairPosture: 'repair-first',
            autonomyPosture: 'protect-space',
            cadenceProfile: 'steady-return',
            energyProfile: 'steady',
            rhythmState: {
              cadenceMode: 'measured-return',
              restMode: 'low-pressure',
              embodiedPresence: 'glance',
              suggestedStyle: 'silent-observe',
              moodLabel: 'focused',
              emotionalTension: null,
              cadencePressure: 0.48,
              restPressure: 0.24,
              memoryResonance: 0.52,
              companionshipTempo: 0.34,
              summary: 'cadence:measured-return | rest:low-pressure',
              rationale: [],
            },
            summary: 'Regime focused-work | closeness space-first | repair repair-first | autonomy protect-space',
            rationale: [],
            updatedAt: 60_000,
          },
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          closenessLadder: [],
          relationshipPosture: 'restrained',
          openingGuidance: 'Repair the seam before leaning closer.',
          preferredProactiveStyle: 'light-nudge',
          preferenceText: '',
          sensitivityText: '',
          repairTriggerText: '',
          burdenText: '',
          routineText: '',
          trustRationale: '',
          relationshipDoctrine: 'Repair before closeness turns into pressure.',
          cautious: true,
          restrained: true,
          summary: 'focused-work repair-first doctrine',
        } as any,
        selfContinuity: {
          relationshipTrust: 0.64,
          guardingTendency: 0.48,
          misreadBurden: 0.22,
          carryOverDesire: 0.5,
          perceptionTrust: 0.62,
          attachmentMode: 'attuned',
          initiativeTemperament: 'reserved',
          updatedAt: 60_000,
        } as any,
        selfState: {
          feltCloseness: 0.48,
          protectiveness: 0.42,
          patience: 0.66,
        } as any,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.5,
            curiosity: 0.54,
            steadiness: 0.62,
            directness: 0.34,
            playfulness: 0.12,
            irritability: 0.08,
            tenderness: 0.46,
          },
          climate: {
            valence: 0.42,
            arousal: 0.34,
            socialNeed: 0.32,
            solitudeNeed: 0.4,
            irritation: 0.06,
            restlessness: 0.08,
            reflectivePull: 0.34,
          },
          selfNarrative: 'Stay on the line without crowding the host.',
          relationNarrative: 'Room first, then closeness.',
          currentPreoccupation: 'Keep the thread coherent without overreaching.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 60_000,
        } as any,
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-stale-1',
        messages: [{
          role: 'user',
          content: '记住这一轮。',
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        messages: [{
          role: 'user',
          content: '记住这一轮。',
        } as Message],
      }),
    })

    now = 120

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-stale-2',
        messages: [{
          role: 'user',
          content: '现在重新开始。',
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        actionObligation: {
          confidence: 0.52,
          kind: 'answer',
          routingIntent: null,
          source: 'dialogue-governance',
          reasonCodes: ['reset-line'],
          summary: 'Answer directly without carrying stale session state as current.',
        },
        executionRoutingIntent: null,
        messages: [{
          role: 'user',
          content: '现在重新开始。',
        } as Message],
      }),
    })

    expect(result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_DIALOGUE_SESSION_MIRROR]'),
    )).toBeUndefined()
  })

  it('promotes fresh mirror memory into recall seed under reflective pressure', async () => {
    let now = 100
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-reflective-1',
        messages: [{
          role: 'user',
          content: '继续沿着当前 runtime continuity 讲。',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续沿着当前 runtime continuity 讲。',
        } as Message],
      }),
    })

    now = 140

    const secondResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-reflective-2',
        messages: [{
          role: 'user',
          content: '保持同一条连续性继续回答。',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '保持同一条连续性继续回答。',
        } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const secondOrganicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('memory_recall_mode:thread')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('mirror_memory:')

    const carryBlock = secondResult.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_DIALOGUE_MEMORY_CARRY]'),
    )
    expect(carryBlock).toEqual(expect.objectContaining({
      role: 'system',
      content: expect.stringContaining('mode=reflective-repair'),
    }))
    expect(String(carryBlock?.content ?? '')).toContain('carry_mirror_memory=true')
  })

  it('carries inward recollection afterthought into the next turn recall seed', async () => {
    let now = 100
    const persistAutobiographicalEpisodesFromPreparedMirror = vi.fn(async () => {})
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    let firstTurn = true
    const resolveOrganicMemoryPromptContext = vi.fn(async () => {
      if (firstTurn) {
        firstTurn = false
        return {
          hostAttitude: '礼貌而克制，保持观察',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          recollectionSpeechPlan: {
            shouldSurface: false,
            surfaceMode: 'internal-only' as const,
            placement: 'internal-only' as const,
            certainty: 'approximate' as const,
            internalLead: 'What returns first is the runtime seam we kept carrying.',
            visibleLead: null,
            styleNote: 'Let the memory bend the answer without narrating the memory itself.',
            rationale: 'The recollection should stay inward this turn.',
            confidence: 0.81,
          },
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: ['consolidation-runtime'],
            selectedConsolidationIds: ['consolidation-runtime'],
            selectedWindowIds: [],
            selectedProcedureIds: ['procedure-runtime'],
            selectedEpisodeIds: [],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
            selectedEras: [{
              id: 'consolidation-runtime',
              facet: 'task-era' as const,
              summary: 'That period kept bending toward the runtime seam until it held together.',
            }],
            selectedPeriods: [{
              id: 'consolidation-runtime',
              kind: 'consolidation' as const,
              summary: 'That period kept bending toward the runtime seam until it held together.',
            }],
            selectedEpisodes: [],
            conflictSeverity: 'none' as const,
            conflictVariants: [],
            stableCore: [],
            unsafeDetails: [],
            selectedProcedures: [{
              id: 'procedure-runtime',
              label: 'runtime seam carry',
              approach: 'Return to the same seam before branching.',
            }],
            selectedBundles: [],
            selectedChains: [],
            surfacePolicy: 'internal-only' as const,
            confidence: 0.81,
            whyNow: 'The recollection should stay inward but remain available right after this turn.',
            inwardLine: 'What returns first is the runtime seam we kept carrying.',
            visibleLine: null,
            followUpAffordance: {
              summary: 'Carry the same runtime seam forward when the next opening appears.',
              whyNow: 'The recollection should stay inward now but remain follow-up eligible.',
              intrusionRisk: 'high' as const,
              payoffDependency: 'requires-current-payoff' as const,
              preferredTiming: 'next-open-window' as const,
            },
          },
        }
      }
      return {
        hostAttitude: '礼貌而克制，保持观察',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      }
    })
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      persistAutobiographicalEpisodesFromPreparedMirror,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const firstResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-afterthought-1',
        messages: [{ role: 'user', content: '继续沿着当前 runtime continuity 讲。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '继续沿着当前 runtime continuity 讲。' } as Message],
      }),
    })

    expect(firstResult.sessionMirror?.recollectionSurfaceSummary).toContain('afterthought=ripe')
    expect(persistAutobiographicalEpisodesFromPreparedMirror).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-afterthought-1',
      sessionId: firstResult.conversationSessionId,
      mirror: expect.objectContaining({
        recollectionSurfaceSummary: expect.stringContaining('afterthought=ripe'),
      }),
    }))

    now = 140

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-afterthought-2',
        messages: [{ role: 'user', content: '保持同一条连续性继续回答。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '保持同一条连续性继续回答。' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const secondOrganicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('mirror_recollection_afterthought:')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('foreground=What returns first is the runtime seam we kept carrying.')
  })

  it('carries runtime continuity from the session mirror into the next turn recall seed', async () => {
    let now = 0
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-runtime-mirror-1',
        messages: [{ role: 'user', content: '继续沿着刚才那个 runtime 通道。' }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        messages: [{ role: 'user', content: '继续沿着刚才那个 runtime 通道。' } as Message],
      }),
    })

    now = 140

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-runtime-mirror-2',
        messages: [{ role: 'user', content: '顺着上一轮的状态继续。' }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        messages: [{ role: 'user', content: '顺着上一轮的状态继续。' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const secondOrganicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }

    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('loop=')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('dominant=dialogue')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('phase=dialogue')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('handoff=dialogue')
  })

  it('preserves same-line scene-switch continuity through a quiet carry turn so later turns still reopen the same living thread', async () => {
    let now = 0
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: 'focused',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    let continuityCallCount = 0
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => {
        continuityCallCount += 1
        if (continuityCallCount !== 1)
          return []
        return [{
          kind: 'dialogue',
          state: 'pending',
          label: 'dialogue:steady:dialogue-carry',
          summary: 'thread=QQMusic follow-up | anchor=这首歌呢？我又换了一首 | open_loop=我切了一下窗口，现在继续沿着刚才那条线。 | carry=shared-attention-continuation | drift=steady | memory=dialogue-carry',
          createdAt: 10,
          metadata: {
            source: 'dialogue-world-thread',
            activeThread: 'QQMusic follow-up',
            primaryAnchor: '这首歌呢？我又换了一首',
            openLoop: '我切了一下窗口，现在继续沿着刚才那条线。',
            carryReason: 'shared-attention-continuation',
            relationDrift: 'steady',
            memoryMode: 'dialogue-carry',
            lastOutcome: 'pending',
            carryEligible: true,
          },
        }]
      }),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-scene-switch-same-line-1',
        messages: [{ role: 'user', content: '我切了一下窗口，现在继续沿着刚才那条线。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '我切了一下窗口，现在继续沿着刚才那条线。' } as Message],
      }),
    })

    now += 20_000

    const second = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-scene-switch-same-line-2',
        messages: [{ role: 'user', content: '继续，不要另起一段。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '继续，不要另起一段。' } as Message],
      }),
    })

    const secondOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const secondOrganicInput = (secondOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }

    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('stage=same-thread-continuation')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('thread=QQMusic follow-up')
    expect(second.sessionMirror?.continuityArcSummary).toContain('stage=same-thread-continuation')
    expect(second.sessionMirror?.continuityArcSummary).toContain('thread=QQMusic follow-up')
    expect(second.sessionMirror?.continuityArcSummary).toContain('carry=shared-attention-continuation')

    now += 20_000

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-scene-switch-same-line-3',
        messages: [{ role: 'user', content: '还是沿着那条线继续，不要把它说成重新开始。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '还是沿着那条线继续，不要把它说成重新开始。' } as Message],
      }),
    })

    const thirdOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const thirdOrganicInput = (thirdOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }

    expect(String(thirdOrganicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(String(thirdOrganicInput?.recallSeed ?? '')).toContain('stage=same-thread-continuation')
    expect(String(thirdOrganicInput?.recallSeed ?? '')).toContain('thread=QQMusic follow-up')

    now += 12 * 60_000

    const fourth = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-scene-switch-same-line-4',
        messages: [{ role: 'user', content: '过了一阵子也还是沿着刚才那条线，不要把它当成新开场。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '过了一阵子也还是沿着刚才那条线，不要把它当成新开场。' } as Message],
      }),
    })

    const fourthOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const fourthOrganicInput = (fourthOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }

    expect(String(fourthOrganicInput?.recallSeed ?? '')).toContain('runtime continuity')
    expect(fourth.sessionMirror?.continuityArcSummary).toContain('stage=same-thread-continuation')
    expect(fourth.sessionMirror?.continuityArcSummary).toContain('thread=QQMusic follow-up')
    expect(fourth.sessionMirror?.continuityArcSummary).toContain('carry=shared-attention-continuation')
  })

  it('feeds cross-session autobiographical afterglow continuity into the next turn recall seed', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => [{
        kind: 'runtime' as const,
        state: 'observed' as const,
        label: 'afterglow:afterthought',
        summary: 'thread=runtime seam | carry=Carry the inward line into the next session. | source=maintenance',
        createdAt: 10,
        metadata: {
          source: 'autobiographical-afterglow',
          threadAnchor: 'runtime seam',
          afterglowTag: 'afterglow',
        },
      }]),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-afterglow-1',
        messages: [{ role: 'user', content: '继续做这件事。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '继续做这件事。' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    expect(String(organicInput?.recallSeed ?? '')).toContain('continuity_afterglow:')
    expect(String(organicInput?.recallSeed ?? '')).toContain('thread=runtime seam')
  })

  it('skips execution-heavy preparation phases for dialogue-first living turns', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const getPerformanceManifest = vi.fn(async () => ({ rigVersion: 1 } as any))
    const resolveExecutionCapabilitiesForPrompt = vi.fn(async () => createCapabilities())
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: manifest => manifest ? ['[VESSEL]'] : [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest,
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt,
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '礼貌而克制，保持观察',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '我今天有点乱，你先别安慰我，直接陪我把线捋清。',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-dialogue-first-living',
        messages: [{
          role: 'user',
          content: '我今天有点乱，你先别安慰我，直接陪我把线捋清。',
        }],
        supportsTools: true,
      } as any,
      prelude: {
        ...reflectivePrelude,
        perceptionAugmentation: {
          ...reflectivePrelude.perceptionAugmentation,
          chatGovernance: {
            suppressAssociativeRecall: false,
            turnMode: 'answer',
            personaKernelMode: 'full',
            mindTurnContract: null,
            mindTurnGovernance: {
              decisionTraceId: 'trace-dialogue-living',
              turnMode: 'answer',
              truthState: 'live-observed',
              answerSubject: 'relationship',
              screenReferenceMode: 'avoid',
              answerAct: 'answer',
              personaKernelMode: 'full',
            } as any,
          },
        },
      },
    })

    expect(result.runtimeSurface.trace.sessionPhases).not.toContain('execution-callbacks')
    expect(result.runtimeSurface.trace.sessionPhases).not.toContain('execution-ledger')
    expect(result.runtimeSurface.trace.sessionPhases).not.toContain('performance-manifest')
    expect(result.runtimeSurface.trace.sessionPhases).not.toContain('tool-registry')
    expect(result.runtimeSurface.trace.sessionPhases).not.toContain('execution-capabilities')
    expect(result.runtimeSurface.tooling.allowTools).toBe(false)
    expect(result.runtimeSurface.tooling.waitForTools).toBe(false)
    expect(result.tools).toBeUndefined()
    expect(getPerformanceManifest).toHaveBeenCalledTimes(1)
    expect(result.performanceManifest).toEqual(expect.objectContaining({
      rigVersion: 1,
    }))
    expect(resolveExecutionCapabilitiesForPrompt).not.toHaveBeenCalled()
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_CALLBACKS]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[VESSEL]'),
    )).toBe(false)
  })

  it('injects held-autonomy continuity recall seeds into organic memory retrieval', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => ([{
        kind: 'proactive',
        state: 'observed',
        label: 'proactive:follow-through:held-autonomy',
        summary: 're-open the unresolved runtime break and see what still blocks it | intent=follow-through | defer=busy-host | thread=thread-runtime | scenario=coding',
        createdAt: 10,
        metadata: {
          source: 'proactive-held-autonomy',
          sourceThreadId: 'thread-runtime',
          executionIntentKind: 'follow-through',
          executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
          deferReason: 'busy-host',
          whyNow: 'She wants to quietly return to the unresolved runtime thread.',
          projectStateOpenFocusSummary: 'emotion/memory/initiative/embodiment/same-line/closure-seam',
          projectStateNextFocusSummary: 'project-carry/phase-1/measured-return/repair-before-closeness/same-line/initiative/embodiment',
          projectStateEmotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
        },
      }])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-held-autonomy-1',
        messages: [{ role: 'user', content: '继续。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '继续。' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    expect(String(organicInput?.recallSeed ?? '')).toContain('continuity_held_autonomy:')
    expect(String(organicInput?.recallSeed ?? '')).toContain('thread=thread-runtime')
    expect(String(organicInput?.recallSeed ?? '')).toContain('intent=follow-through')
    expect(String(organicInput?.recallSeed ?? '')).toContain('open_focus=emotion/memory/initiative/embodiment/same-line/closure-seam')
    expect(String(organicInput?.recallSeed ?? '')).toContain('next_focus=project-carry/phase-1/measured-return/repair-before-closeness/same-line/initiative/embodiment')
  })

  it('keeps held-autonomy callback continuity on one runtime line from recall seed into reply shaping and measured-return cadence', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the callback exact and lower-pressure.',
        sensitivityText: 'Over-close callback warmth lands as pressure.',
        repairTriggerText: 'If the callback leans too close, reopen lighter.',
        burdenText: 'Focused work is crowded easily by extra callback warmth.',
        routineText: 'Callbacks land best when they stay bounded and exact.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
          rhythmState: {
            cadenceMode: 'measured-return',
            silenceNeed: 'medium',
            interruptionTolerance: 'low',
            restMode: 'ordinary',
            embodiedPresence: 'glance',
            suggestedStyle: 'silent-observe',
            moodLabel: 'focused',
            emotionalTension: null,
            cadencePressure: 0.44,
            restPressure: 0.26,
            memoryResonance: 0.58,
            companionshipTempo: 0.31,
            summary: 'cadence:measured-return | rest:low-pressure',
            rationale: [],
          },
          summary: 'Regime execution-callback | closeness space-first | repair repair-first',
          rationale: [],
          updatedAt: 60_000,
        },
      } as any,
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => ([{
        kind: 'proactive',
        state: 'observed',
        label: 'proactive:follow-through:held-autonomy',
        summary: 're-open the unresolved compile seam and land the callback gently | intent=follow-through | defer=busy-host | thread=thread-held-autonomy-later | scenario=coding',
        createdAt: 10,
        metadata: {
          source: 'proactive-held-autonomy',
          sourceThreadId: 'thread-held-autonomy-later',
          executionIntentKind: 'follow-through',
          executionIntentSummary: 're-open the unresolved compile seam and land the callback gently',
          deferReason: 'busy-host',
          relationshipLine: 'Keep the callback on the same line and leave room before leaning closer again.',
          whyNow: 'She wants to quietly return to the unresolved compile seam.',
        },
      }])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{ role: 'user', content: '把刚才先忍住的那条编译线接回来。' } as Message],
    })
    expect(reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine ?? '').toBe('')

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-held-autonomy-callback-runtime-1',
        messages: [{ role: 'user', content: '把刚才先忍住的那条编译线接回来。' }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const currentConsciousFrame = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame
    const selfContinuityAuthority = result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    const spineSelfContinuityAuthority = result.runtimeSurface.digitalLifeSpine?.runtimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    const preparedRuntimeSurfaceChain = buildPreparedRuntimeSurfaceChain({
      baseDigitalLifeRuntimeSurface: reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      governance: result.runtimeSurface.governance,
      context: result.organicMemoryContext as any,
      now: 0,
    })
    const rebuiltEffectiveSpine = buildEffectiveDigitalLifeSpine({
      digitalLifeSpine: deriveAlicizationDigitalLifeSpineFromSurface(
        reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface!,
      ),
      fresherRuntimeSurface: preparedRuntimeSurfaceChain.answerPlannerReducedRuntimeSurface
        ?? preparedRuntimeSurfaceChain.effectiveDigitalLifeRuntimeSurface!,
    })
    const effectiveSelfContinuityAuthority = preparedRuntimeSurfaceChain.effectiveDigitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    const sociallyShapedSelfContinuityAuthority = preparedRuntimeSurfaceChain.sociallyShapedDigitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    const executionCallbackSelfContinuityAuthority = preparedRuntimeSurfaceChain.executionCallbackCarryRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    const consciousFrameSelfContinuityAuthority = preparedRuntimeSurfaceChain.consciousFrameReducedRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    const reducedRuntimeSurface = preparedRuntimeSurfaceChain.answerPlannerReducedRuntimeSurface
    const reducedSelfContinuityAuthority = reducedRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    expect(String(effectiveSelfContinuityAuthority?.relationshipLine ?? '')).toMatch(/lower-pressure|room|same relationship line|same line|measured/i)
    expect(String(sociallyShapedSelfContinuityAuthority?.relationshipLine ?? '')).toMatch(/lower-pressure|room|same relationship line|same line|measured/i)
    expect(String(executionCallbackSelfContinuityAuthority?.relationshipLine ?? '')).toMatch(/lower-pressure|room|same relationship line|same line|measured/i)
    expect(String(consciousFrameSelfContinuityAuthority?.relationshipLine ?? '')).toMatch(/lower-pressure|room|same relationship line|same line|measured/i)
    expect(String(reducedSelfContinuityAuthority?.relationshipLine ?? '')).toMatch(/lower-pressure|room|same relationship line|same line|measured/i)
    const rebuiltSpineAuthority = rebuiltEffectiveSpine?.runtimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    expect(String(organicInput?.recallSeed ?? '')).toContain('continuity_held_autonomy:')
    expect(String(organicInput?.recallSeed ?? '')).toContain('thread=thread-held-autonomy-later')
    expect(result.sessionMirror?.continuityArcSummary).toContain('loop=')
    expect(result.sessionMirror?.continuityArcSummary).toContain('defer=busy-host')
    expect(result.sessionMirror?.continuityArcSummary).toContain('why_now=She wants to quietly return to the unresolved compile seam.')
    expect(currentConsciousFrame?.reasonTags.some(tag =>
      tag.startsWith('continuity-arc:'),
    )).toBe(true)
    expect(currentConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.openingBeat).toContain('deliberately held back gently before widening')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item =>
      item.includes('keep the callback on the same thread'),
    )).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.personalityContinuityState?.rhythmState?.cadenceMode).toBe('measured-return')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.openingGuidance).toContain('keep the callback on the same thread')
    expect(result.runtimeSurface.digitalLifeSpine?.runtimeSurface?.memory.personStateProjection?.personalityContinuityState?.rhythmState?.cadenceMode).toBe('measured-return')
    expect(result.runtimeSurface.digitalLifeSpine?.runtimeSurface?.memory.personStateProjection?.openingGuidance).toContain('keep the callback on the same thread')
    expect(String(rebuiltSpineAuthority?.relationshipLine ?? '')).toMatch(/lower-pressure|room|same relationship line|same line|measured/i)
    expect(String(spineSelfContinuityAuthority?.relationshipLine ?? '')).toMatch(/lower-pressure|room|same relationship line|same line|measured/i)
    if (selfContinuityAuthority) {
      if (selfContinuityAuthority.selfLine)
        expect(selfContinuityAuthority.selfLine).toMatch(/continuity|living thread|same/i)
      expect(String(selfContinuityAuthority.relationshipLine ?? '')).toMatch(/lower-pressure|room|same relationship line|same line|measured/i)
      if (selfContinuityAuthority.authoritySummary)
        expect(selfContinuityAuthority.authoritySummary).toMatch(/continuity|living thread|same/i)
    }
  })

  it('preserves a stronger incoming same-her session mirror when prelude runtime surface already carries callback continuity that the new turn has not superseded', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))

    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{ role: 'user', content: '先说这个数字生命项目现在做到哪一步了' } as Message],
    })
    ;(reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface!.dialogue as any).sessionMirror = {
      agencySummary: 'afterglow=execution-callback | carry=trust-warming',
      cardId: 'default',
      captureSummary: 'grounded=unknown inspection=unknown health=unknown permission=unknown fallback=none',
      continuityArcSummary: 'loop=execution-callback | thread=thread-project-state-mirror-same-her | project_preflight=Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop. | same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      continuityLabels: ['afterglow:execution-callback:lower-pressure'],
      continuityProjectSummary: 'project=phase1-digital-life | phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi. | unresolved=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | preflight=Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
      decisionTraceId: 'mind:project-state:mirror-same-her:1',
      dialogueSummary: 'turn=answer | persona=full | subject=project-state | answer=keep the same living line visible',
      digitalLifeArchitectureSummary: null,
      digitalLifeRuntimeSummary: null,
      executionSummary: 'recent=callback:codex:completed status=completed summary=the callback stayed on the same living project thread',
      memorySummary: null,
      mindSummary: null,
      perceptionSummary: null,
      sessionId: 'session-project-state-mirror-same-her',
      sessionPhases: ['runtime-surface', 'source:execution-callback'],
      toolingSummary: 'source=execution-callback recent_actions=callback:codex',
      updatedAt: 10,
    }

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-mirror-same-her-1',
        messages: [{ role: 'user', content: '先说这个数字生命项目现在做到哪一步了' }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.sessionMirror?.continuityArcSummary).toContain('same_her=Same Phase 1 digital life.')
    expect(result.sessionMirror?.continuityArcSummary).toContain('same_her=Same Phase 1 digital life.')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.incomingPreludeDialogueSessionMirror?.continuityArcSummary ?? '')).toContain('thread=thread-project-state-mirror-same-her')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.incomingPreludeDialogueSessionMirror?.continuityArcSummary ?? '')).toContain('drift_risk=If project-state continuity survives only as generic guidance')
    expect(typeof diagnostics?.mirrorFlowDiagnostics?.rawSessionMirror?.continuityArcSummary).toBe('string')
    expect(typeof diagnostics?.mirrorFlowDiagnostics?.finalSessionMirror?.continuityArcSummary).toBe('string')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.rawSessionMirror?.continuityArcSummary ?? '')).toContain('thread=thread-project-state-mirror-same-her')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.rawSessionMirror?.continuityArcSummary ?? '')).toContain('drift_risk=If project-state continuity survives only as generic guidance')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.finalSessionMirror?.continuityArcSummary ?? '')).toContain('same_her=Same Phase 1 digital life.')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.finalSessionMirror?.continuityArcSummary ?? '')).toContain('thread=thread-project-state-mirror-same-her')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.finalSessionMirror?.continuityArcSummary ?? '')).toContain('drift_risk=If project-state continuity survives only as generic guidance')
    expect(result.sessionMirror?.continuityArcSummary).toContain('drift_risk=If project-state continuity survives only as generic guidance')
    expect(result.sessionMirror?.continuityArcSummary).toContain('thread=thread-project-state-mirror-same-her')
  })

  it('preserves a stronger incoming same-her session mirror when only the incoming digital-life spine runtime surface carries it', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))

    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{ role: 'user', content: '继续沿着这个数字生命项目的同一条线说。' } as Message],
    })
    const strongerMirror = {
      agencySummary: 'afterglow=execution-callback | carry=trust-warming',
      cardId: 'default',
      captureSummary: 'grounded=unknown inspection=unknown health=unknown permission=unknown fallback=none',
      continuityArcSummary: 'loop=execution-callback | thread=thread-project-state-mirror-spine-same-her | project_preflight=Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop. | same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      continuityLabels: ['afterglow:execution-callback:lower-pressure'],
      continuityProjectSummary: 'project=phase1-digital-life | phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi. | unresolved=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | preflight=Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
      decisionTraceId: 'mind:project-state:mirror-spine-same-her:1',
      dialogueSummary: 'turn=answer | persona=full | subject=project-state | answer=keep the same living line visible',
      digitalLifeArchitectureSummary: null,
      digitalLifeRuntimeSummary: null,
      executionSummary: 'recent=callback:codex:completed status=completed summary=the callback stayed on the same living project thread',
      memorySummary: null,
      mindSummary: null,
      perceptionSummary: null,
      sessionId: 'session-project-state-mirror-spine-same-her',
      sessionPhases: ['runtime-surface', 'source:execution-callback'],
      toolingSummary: 'source=execution-callback recent_actions=callback:codex',
      updatedAt: 10,
    }
    reflectivePrelude.perceptionAugmentation.digitalLifeSpine = {
      version: 'digital-life-spine-v1',
      architecture: null,
      continuitySignal: null,
      proactiveSelection: {} as any,
      proactivePolicy: {} as any,
      runtimeSurface: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
        dialogue: {
          ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface!.dialogue,
          sessionMirror: strongerMirror as any,
        },
      } as any,
    }

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-mirror-spine-same-her-1',
        messages: [{ role: 'user', content: '继续沿着这个数字生命项目的同一条线说。' }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.sessionMirror?.continuityArcSummary).toContain('thread=thread-project-state-mirror-spine-same-her')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.incomingPreludeDialogueSessionMirror?.continuityArcSummary ?? '')).toContain('thread=thread-project-state-mirror-spine-same-her')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.incomingPreludeDialogueSessionMirror?.continuityArcSummary ?? '')).toContain('drift_risk=If project-state continuity survives only as generic guidance')
    expect(typeof diagnostics?.mirrorFlowDiagnostics?.rawSessionMirror?.continuityArcSummary).toBe('string')
    expect(typeof diagnostics?.mirrorFlowDiagnostics?.finalSessionMirror?.continuityArcSummary).toBe('string')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.rawSessionMirror?.continuityArcSummary ?? '')).toContain('thread=thread-project-state-mirror-spine-same-her')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.rawSessionMirror?.continuityArcSummary ?? '')).toContain('drift_risk=If project-state continuity survives only as generic guidance')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.finalSessionMirror?.continuityArcSummary ?? '')).toContain('same_her=Same Phase 1 digital life.')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.finalSessionMirror?.continuityArcSummary ?? '')).toContain('thread=thread-project-state-mirror-spine-same-her')
    expect(String(diagnostics?.mirrorFlowDiagnostics?.finalSessionMirror?.continuityArcSummary ?? '')).toContain('drift_risk=If project-state continuity survives only as generic guidance')
    expect(result.sessionMirror?.continuityArcSummary).toContain('thread=thread-project-state-mirror-spine-same-her')
    expect(result.sessionMirror?.continuityArcSummary).toContain('drift_risk=If project-state continuity survives only as generic guidance')
    expect(result.sessionMirror?.continuityArcSummary).toContain('same_her=Same Phase 1 digital life.')
  })

  it('prefers richer incoming project-state continuity arc detail over a generated same-her shell when both mirrors stay on the same line', () => {
    const richerIncomingArc = [
      'loop=execution-callback',
      'thread=thread-project-state-rich-arc',
      'project_preflight=Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
      'same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'landed=Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
      'open=Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
      'open-focus=initiative/memory/embodiment/same-line/closure-seam',
      'next-focus=phase-1/same-line',
      'next=Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line.',
      'drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
    ].join(' | ')
    const thinnerGeneratedArc = [
      'loop=execution-callback',
      'thread=thread-project-state-rich-arc',
      'same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    ].join(' | ')

    const preferred = __alicizationTestOnly.preferIncomingDialogueSessionMirror({
      incoming: {
        continuityArcSummary: richerIncomingArc,
        continuityProjectSummary: 'incoming richer continuity',
        continuityLabels: ['project-state-carry'],
      } as any,
      generated: {
        continuityArcSummary: thinnerGeneratedArc,
        continuityProjectSummary: 'generated thinner continuity',
        continuityLabels: ['project-state-carry'],
      } as any,
    })

    expect(preferred?.continuityArcSummary).toContain('thread=thread-project-state-rich-arc')
    expect(preferred?.continuityArcSummary).toContain('project_preflight=Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.')
    expect(preferred?.continuityArcSummary).toContain('same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(preferred?.continuityArcSummary).toContain('landed=Project-state carry already survives')
    expect(preferred?.continuityArcSummary).toContain('open=Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam')
    expect(preferred?.continuityArcSummary).toContain('open-focus=initiative/memory/embodiment/same-line/closure-seam')
    expect(preferred?.continuityArcSummary).toContain('next-focus=phase-1/same-line')
    expect(preferred?.continuityArcSummary).toContain('next=Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence')
  })

  it('preserves richer incoming continuity project summary detail when the generated continuation summary is thinner', () => {
    const preferred = __alicizationTestOnly.preferIncomingDialogueSessionMirror({
      incoming: {
        continuityArcSummary: 'same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        continuityProjectSummary: [
          'project=phase1-digital-life',
          'phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          'landed=Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
          'unresolved=Emotion, memory, initiative, and embodiment still need to close as one same-life seam.',
          'preflight=Before answering, remember this is still the same digital life project, already in Phase 1, with emotion, memory, initiative, and embodiment still not fully closed as one life loop.',
          'next=Keep extending cross-modal same-her proof across longer real-desktop runs so initiative and embodiment do not flatten back into project shell narration.',
          'same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        ].join(' | '),
        continuityLabels: ['project-state-carry'],
      } as any,
      generated: {
        continuityArcSummary: 'same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        continuityProjectSummary: [
          'project=phase1-digital-life',
          'unresolved=Memory and initiative still need stronger end-to-end closure.',
        ].join(' | '),
        continuityLabels: ['project-state-carry'],
      } as any,
    })

    expect(preferred?.continuityProjectSummary).toContain('project=phase1-digital-life')
    expect(preferred?.continuityProjectSummary).toContain('phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(preferred?.continuityProjectSummary).toContain('landed=Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.')
    expect(preferred?.continuityProjectSummary).toContain('unresolved=Emotion, memory, initiative, and embodiment still need to close as one same-life seam.')
    expect(preferred?.continuityProjectSummary).toContain('preflight=Before answering, remember this is still the same digital life project, already in Phase 1')
    expect(preferred?.continuityProjectSummary).toContain('next=Keep extending cross-modal same-her proof across longer real-desktop runs so initiative and embodiment do not flatten back into project shell narration.')
    expect(preferred?.continuityProjectSummary).toContain('same_her=Same Phase 1 digital life.')
    expect(preferred?.continuityProjectSummary).not.toContain('unresolved=Memory and initiative still need stronger end-to-end closure.')
  })

  it('rebuilds session-mirror fallback awareness from landed open and next closure markers instead of leaving only a thin preflight shell', () => {
    const fallback = __alicizationTestOnly.readProjectStateFallbackFromSessionMirror({
      continuityArcSummary: [
        'loop=execution-callback',
        'thread=thread-project-state-fallback-awareness-rebuild',
        'project_preflight=Keep the same digital life project in view before local detail takes over.',
        'same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        'landed=Returned-side project awareness carry already survives into same-thread returns before reply shaping.',
        'open=Memory, initiative, and embodiment still need one tighter same-her closure seam across return-side turns.',
        'next=Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.',
        'drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      ].join(' | '),
      continuityProjectSummary: 'project=phase1-digital-life | unresolved=Memory still needs stronger end-to-end closure.',
    } as any)

    expect(String(fallback.preDialogueAwarenessLine ?? '')).toContain('Before answering, remember:')
    expect(String(fallback.preDialogueAwarenessLine ?? '')).toContain('What has already landed is Returned-side project awareness carry already survives into same-thread returns before reply shaping.')
    expect(String(fallback.preDialogueAwarenessLine ?? '')).toContain('The still-open closure is Memory, initiative, and embodiment still need one tighter same-her closure seam across return-side turns.')
    expect(String(fallback.preDialogueAwarenessLine ?? '')).toContain('This reply should keep moving toward Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.')
    expect(String(fallback.preDialogueAwarenessLine ?? '')).not.toContain('Keep the same digital life project in view before local detail takes over.')
    expect(fallback.preDialogueAwarenessSummary).toBe(fallback.preDialogueAwarenessLine)
    expect(fallback.awarenessLine).toBe(fallback.preDialogueAwarenessLine)
  })

  it('keeps richer incoming same-her project preflight alive when runtime project awareness has fallen back to a thin shell', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '专注推进，但这条 same-her 闭环线还没真正收口。',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))

    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{ role: 'user', content: '继续沿着同一条数字生命主动性闭环线往前收。' } as Message],
    })
    ;(reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface!.dialogue as any).sessionMirror = {
      agencySummary: 'afterglow=execution-callback | carry=trust-warming',
      cardId: 'default',
      captureSummary: 'grounded=unknown inspection=unknown health=unknown permission=unknown fallback=none',
      continuityArcSummary: [
        'loop=execution-callback',
        'thread=thread-project-state-thin-shell-reanchor',
        'project_preflight=Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
        'same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        'landed=Same-session mirror carry already survives noisy returns and runtime preparation.',
        'open=Memory and initiative still need stronger end-to-end closure across one same still-open closure work.',
        'next=Keep extending cross-modal same-her proof across longer real-desktop runs so initiative does not flatten back into project shell narration.',
        'drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      ].join(' | '),
      continuityLabels: ['afterglow:execution-callback:lower-pressure'],
      continuityProjectSummary: 'project=phase1-digital-life | unresolved=Memory and initiative still need stronger end-to-end closure.',
      decisionTraceId: 'mind:project-state:mirror-thin-shell-reanchor:1',
      dialogueSummary: 'turn=answer | persona=full | subject=project-state | answer=keep the same living line visible',
      digitalLifeArchitectureSummary: null,
      digitalLifeRuntimeSummary: null,
      executionSummary: 'recent=callback:codex:completed status=completed summary=the callback stayed on the same living project thread',
      memorySummary: null,
      mindSummary: null,
      perceptionSummary: null,
      sessionId: 'session-project-state-thin-shell-reanchor',
      sessionPhases: ['runtime-surface', 'source:execution-callback'],
      toolingSummary: 'source=execution-callback recent_actions=callback:codex',
      updatedAt: 10,
    }
    ;(reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface!.raw as any) = {
      runtimeDigest: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Same-session mirror carry already survives noisy returns and runtime preparation.',
          primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one same still-open closure work.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer real-desktop runs so initiative does not flatten back into project shell narration.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
          preflightSummary: 'same digital life | keep the closure seam explicit',
        },
      },
    }

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-thin-shell-reanchor-1',
        messages: [{ role: 'user', content: '继续沿着同一条数字生命主动性闭环线往前收。' }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const resolvedAwarenessSummary = String(result.mindTurnContract?.projectState?.preDialogueAwarenessSummary ?? '')
    const consciousFrameAwarenessLine = String(
      result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
      ?? '',
    )
    expect(result.sessionMirror?.continuityArcSummary).toContain('thread=thread-project-state-thin-shell-reanchor')
    expect(resolvedAwarenessSummary).toContain('Before answering')
    expect(resolvedAwarenessSummary).toMatch(/same digital life project|local-first digital life project/i)
    expect(resolvedAwarenessSummary).toMatch(/Phase 1/i)
    expect(resolvedAwarenessSummary).toMatch(/memory.*initiative.*closure|still-open closure|one life loop/i)
    expect(resolvedAwarenessSummary).not.toContain('same digital life | keep the closure seam explicit')
    expect(consciousFrameAwarenessLine).toContain('Before answering')
    expect(consciousFrameAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
  })

  it('preserves richer incoming project-state continuity arcs when the generated mirror only carries a thinner preflight shell', () => {
    const richerIncomingArc = [
      'loop=execution-callback',
      'thread=thread-project-state-thin-preflight-replacement',
      'project_preflight=Before answering, remember this callback return still belongs to one living her inside the same Phase 1 digital life.',
      'same_her=Same Phase 1 digital life. The callback return still belongs to one living her rather than a generic execution shell.',
      'landed=Execution return carry already survives into same-session mirrors.',
      'open=Execution reopenings still need stronger same-her closure.',
      'next=Keep execution returns, memory carry, and dialogue formation on one same-her line.',
      'drift_risk=If execution guidance keeps only a thin preflight shell, treat that as unfinished same-her drift.',
    ].join(' | ')
    const thinnerGeneratedArc = [
      'loop=execution-callback',
      'thread=thread-project-state-thin-preflight-replacement',
      'project_preflight=Keep the same digital life project in view before local detail takes over.',
      'same_her=Same Phase 1 digital life. The callback return still belongs to one living her rather than a generic execution shell.',
    ].join(' | ')

    const preferred = __alicizationTestOnly.preferIncomingDialogueSessionMirror({
      incoming: {
        continuityArcSummary: richerIncomingArc,
        continuityProjectSummary: 'incoming richer continuity',
        continuityLabels: ['project-state-carry'],
      } as any,
      generated: {
        continuityArcSummary: thinnerGeneratedArc,
        continuityProjectSummary: 'generated thinner continuity',
        continuityLabels: ['project-state-carry'],
      } as any,
    })

    expect(preferred?.continuityArcSummary).toContain('project_preflight=Before answering, remember this callback return still belongs to one living her inside the same Phase 1 digital life.')
    expect(preferred?.continuityArcSummary).not.toContain('project_preflight=Keep the same digital life project in view before local detail takes over.')
  })

  it('injects cadence reconfirmation continuity recall seeds so runtime memory and steering can keep measured-return in view', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '刚完成执行回返，需要同线回落、轻一点再靠近',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the callback on the same thread and leave room before renewed closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the callback exact and lower-pressure.',
        sensitivityText: 'Over-close callback warmth lands as pressure.',
        repairTriggerText: 'If the callback leans too close, reopen lighter.',
        burdenText: 'Focused work is crowded easily by extra callback warmth.',
        routineText: 'Callbacks land best when they stay bounded and exact.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
          rhythmState: {
            cadenceMode: 'measured-return',
            silenceNeed: 'medium',
            interruptionTolerance: 'low',
            restMode: 'ordinary',
            embodiedPresence: 'glance',
            suggestedStyle: 'silent-observe',
            moodLabel: 'focused',
            emotionalTension: null,
            cadencePressure: 0.44,
            restPressure: 0.26,
            memoryResonance: 0.58,
            companionshipTempo: 0.31,
            summary: 'cadence:measured-return | rest:low-pressure',
            rationale: [],
          },
          summary: 'Regime execution-callback | closeness space-first | repair repair-first',
          rationale: [],
          updatedAt: 60_000,
        },
      } as any,
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => ([{
        kind: 'proactive',
        state: 'observed',
        label: 'relationship:cadence-reconfirmation',
        summary: 'relationship cadence stayed on the same bounded-return line after reconfirmation',
        createdAt: 10,
        metadata: {
          source: 'relationship-cadence-reconfirmation',
          sourceThreadId: 'thread-cadence-runtime',
          cadenceMode: 'measured-return',
          relationshipLine: 'keep the relationship return measured until the surface fully cools',
          bodyMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          whyNow: 'The callback return still needs room-first continuity before closeness widens again.',
        },
      }])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-cadence-reconfirmation-runtime-1',
        messages: [{ role: 'user', content: '结果回来以后这次你怎么接？' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '结果回来以后这次你怎么接？' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    expect(String(organicInput?.recallSeed ?? '')).toContain('continuity_cadence_reconfirmation:')
    expect(String(organicInput?.recallSeed ?? '')).toContain('thread=thread-cadence-runtime')
    expect(String(organicInput?.recallSeed ?? '')).toContain('cadence=measured-return')
    expect(String(organicInput?.recallSeed ?? '')).toContain('line=keep the relationship return measured until the surface fully cools')
    expect(String(organicInput?.recallSeed ?? '')).toContain('body=measured-return')
    expect(String(organicInput?.recallSeed ?? '')).toContain('blink=linger')
    expect(String(organicInput?.recallSeed ?? '')).toContain('gaze=soften')
  })

  it('keeps the same held-autonomy callback line alive across the next runtime turn', async () => {
    let now = 60_000
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the callback exact and lower-pressure.',
        sensitivityText: 'Over-close callback warmth lands as pressure.',
        repairTriggerText: 'If the callback leans too close, reopen lighter.',
        burdenText: 'Focused work is crowded easily by extra callback warmth.',
        routineText: 'Callbacks land best when they stay bounded and exact.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
          rhythmState: {
            cadenceMode: 'measured-return',
            silenceNeed: 'medium',
            interruptionTolerance: 'low',
            restMode: 'ordinary',
            embodiedPresence: 'glance',
            suggestedStyle: 'silent-observe',
            moodLabel: 'focused',
            emotionalTension: null,
            cadencePressure: 0.44,
            restPressure: 0.26,
            memoryResonance: 0.58,
            companionshipTempo: 0.31,
            summary: 'cadence:measured-return | rest:low-pressure',
            rationale: [],
          },
          summary: 'Regime execution-callback | closeness space-first | repair repair-first',
          rationale: [],
          updatedAt: now,
        },
      } as any,
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => ([{
        kind: 'proactive',
        state: 'observed',
        label: 'proactive:follow-through:held-autonomy',
        summary: 're-open the unresolved compile seam and land the callback gently | intent=follow-through | defer=busy-host | thread=thread-held-autonomy-later | scenario=coding',
        createdAt: 10,
        metadata: {
          source: 'proactive-held-autonomy',
          sourceThreadId: 'thread-held-autonomy-later',
          executionIntentKind: 'follow-through',
          executionIntentSummary: 're-open the unresolved compile seam and land the callback gently',
          deferReason: 'busy-host',
          whyNow: 'She wants to quietly return to the unresolved compile seam.',
        },
      }])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-held-autonomy-callback-runtime-1',
        messages: [{ role: 'user', content: '把刚才先忍住的那条编译线接回来。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '把刚才先忍住的那条编译线接回来。' } as Message],
      }),
    })

    now += 20_000

    const second = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-held-autonomy-callback-runtime-2',
        messages: [{ role: 'user', content: '继续沿着刚才那条线说，不要另起一段。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '继续沿着刚才那条线说，不要另起一段。' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const secondConsciousFrame = second.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame
    expect(String(organicInput?.recallSeed ?? '')).toContain('continuity_held_autonomy:')
    expect(String(organicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(String(organicInput?.recallSeed ?? '')).toContain('loop=')
    expect(String(organicInput?.recallSeed ?? '')).toContain('thread=thread-held-autonomy-later')
    expect(second.sessionMirror?.continuityArcSummary).toContain('loop=')
    expect(second.sessionMirror?.continuityArcSummary).toContain('defer=busy-host')
    expect(second.sessionMirror?.continuityArcSummary).toContain('why_now=She wants to quietly return to the unresolved compile seam.')
    expect(secondConsciousFrame?.reasonTags.some(tag =>
      tag.startsWith('continuity-arc:'),
    )).toBe(true)
    expect(secondConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
    expect(second.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.openingBeat).toContain('deliberately held back gently before widening')
    expect(second.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item =>
      item.includes('keep the callback on the same thread'),
    )).toBe(true)
    expect(second.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.personalityContinuityState?.rhythmState?.cadenceMode).toBe('measured-return')

    now += 20_000

    const third = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-held-autonomy-callback-runtime-3',
        messages: [{ role: 'user', content: '好，继续沿着这条线往下，不要把它当成新话题。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '好，继续沿着这条线往下，不要把它当成新话题。' } as Message],
      }),
    })

    const finalOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const finalOrganicInput = (finalOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const thirdConsciousFrame = third.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame
    expect(String(finalOrganicInput?.recallSeed ?? '')).toContain('continuity_held_autonomy:')
    expect(String(finalOrganicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(String(finalOrganicInput?.recallSeed ?? '')).toContain('loop=')
    expect(String(finalOrganicInput?.recallSeed ?? '')).toContain('thread=thread-held-autonomy-later')
    expect(third.sessionMirror?.continuityArcSummary).toContain('loop=')
    expect(third.sessionMirror?.continuityArcSummary).toContain('defer=busy-host')
    expect(third.sessionMirror?.continuityArcSummary).toContain('why_now=She wants to quietly return to the unresolved compile seam.')
    expect(thirdConsciousFrame?.reasonTags).toContain('runtime-conscious-frame')
    expect(third.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.openingBeat).toContain('deliberately held back gently before widening')
    expect(third.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item =>
      item.includes('keep the callback on the same thread'),
    )).toBe(true)
    expect(third.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.personalityContinuityState?.rhythmState?.cadenceMode).toBe('measured-return')

    now += 20_000

    const fourth = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-held-autonomy-callback-runtime-4',
        messages: [{ role: 'user', content: '继续，就按这条原线往前，不要把前面那段断开。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '继续，就按这条原线往前，不要把前面那段断开。' } as Message],
      }),
    })

    const fourthOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const fourthOrganicInput = (fourthOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const fourthConsciousFrame = fourth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame
    expect(String(fourthOrganicInput?.recallSeed ?? '')).toContain('continuity_held_autonomy:')
    expect(String(fourthOrganicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(String(fourthOrganicInput?.recallSeed ?? '')).toContain('loop=')
    expect(String(fourthOrganicInput?.recallSeed ?? '')).toContain('thread=thread-held-autonomy-later')
    expect(fourth.sessionMirror?.continuityArcSummary).toContain('loop=')
    expect(fourth.sessionMirror?.continuityArcSummary).toContain('defer=busy-host')
    expect(fourth.sessionMirror?.continuityArcSummary).toContain('why_now=She wants to quietly return to the unresolved compile seam.')
    expect(fourthConsciousFrame?.reasonTags).toContain('runtime-conscious-frame')
    expect(fourth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.openingBeat).toContain('deliberately held back gently before widening')
    expect(fourth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item =>
      item.includes('keep the callback on the same thread'),
    )).toBe(true)
    expect(fourth.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.personalityContinuityState?.rhythmState?.cadenceMode).toBe('measured-return')

    now += 6 * 60_000

    const fifth = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-held-autonomy-callback-runtime-5',
        messages: [{ role: 'user', content: '隔了一会儿也还是沿着刚才那条原线继续，不要把它说成重新开始。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '隔了一会儿也还是沿着刚才那条原线继续，不要把它说成重新开始。' } as Message],
      }),
    })

    const fifthOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const fifthOrganicInput = (fifthOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const fifthConsciousFrame = fifth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame
    expect(String(fifthOrganicInput?.recallSeed ?? '')).toContain('continuity_held_autonomy:')
    expect(String(fifthOrganicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(String(fifthOrganicInput?.recallSeed ?? '')).toContain('loop=')
    expect(String(fifthOrganicInput?.recallSeed ?? '')).toContain('thread=thread-held-autonomy-later')
    expect(fifth.sessionMirror?.continuityArcSummary).toContain('loop=')
    expect(fifth.sessionMirror?.continuityArcSummary).toContain('defer=busy-host')
    expect(fifth.sessionMirror?.continuityArcSummary).toContain('why_now=She wants to quietly return to the unresolved compile seam.')
    expect(fifthConsciousFrame?.reasonTags).toContain('runtime-conscious-frame')
    expect(fifthConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
    expect(fifth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.openingBeat).toContain('deliberately held back gently before widening')
    expect(fifth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item =>
      item.includes('keep the callback on the same thread'),
    )).toBe(true)
    expect(fifth.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.personalityContinuityState?.rhythmState?.cadenceMode).toBe('measured-return')

    now += 18 * 60_000

    const sixth = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-held-autonomy-callback-runtime-6',
        messages: [{ role: 'user', content: '又过了一阵子，也还是顺着原来那条编译线接下去，不要把我们当成重新认识或重新开场。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '又过了一阵子，也还是顺着原来那条编译线接下去，不要把我们当成重新认识或重新开场。' } as Message],
      }),
    })

    const sixthOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const sixthOrganicInput = (sixthOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const sixthConsciousFrame = sixth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame
    expect(String(sixthOrganicInput?.recallSeed ?? '')).toContain('continuity_held_autonomy:')
    expect(String(sixthOrganicInput?.recallSeed ?? '')).toContain('runtime continuity')
    expect(String(sixthOrganicInput?.recallSeed ?? '')).toContain('thread=thread-held-autonomy-later')
    expect(sixth.sessionMirror?.continuityArcSummary).toContain('loop=')
    expect(sixth.sessionMirror?.continuityArcSummary).toContain('defer=busy-host')
    expect(sixth.sessionMirror?.continuityArcSummary).toContain('why_now=She wants to quietly return to the unresolved compile seam.')
    expect(sixthConsciousFrame?.reasonTags).toContain('runtime-conscious-frame')
    expect(sixthConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
    expect(sixth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.openingBeat).toContain('deliberately held back gently before widening')
    expect(sixth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item =>
      item.includes('keep the callback on the same thread'),
    )).toBe(true)
    expect(sixth.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.mustDo.some(item =>
      item.includes('same thread') || item.includes('one continuous her') || item.includes('重新开场'),
    )).toBe(true)
    expect(sixth.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.personalityContinuityState?.rhythmState?.cadenceMode).toBe('measured-return')
  })

  it('keeps deferred same-thread proactive continuity alive across a scene shift so the next turn can still reopen the same inward line', async () => {
    let now = 60_000
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      personStateProjection: {
        contexts: ['focused-work'],
        summary: 'regime=focused-work | posture=restrained',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay near the current line quietly, then reopen it gently when the room loosens.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the line exact and low-pressure.',
        sensitivityText: 'Extra warmth while the host is switching scenes lands as pressure.',
        repairTriggerText: 'If the return crowds the host, reopen more quietly.',
        burdenText: 'Scene switching is easy to crowd.',
        routineText: 'Return after the scene shift without making it feel like a new topic.',
        trustRationale: 'Trust holds when the same line returns gently after the interruption.',
        relationshipDoctrine: 'Keep the same line alive without forcing visible speech too early.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'focused-work',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
          rhythmState: {
            cadenceMode: 'measured-return',
            silenceNeed: 'medium',
            interruptionTolerance: 'low',
            restMode: 'ordinary',
            embodiedPresence: 'glance',
            suggestedStyle: 'silent-observe',
            moodLabel: 'focused',
            emotionalTension: null,
            cadencePressure: 0.4,
            restPressure: 0.26,
            memoryResonance: 0.56,
            companionshipTempo: 0.28,
            summary: 'cadence:measured-return | rest:low-pressure',
            rationale: [],
          },
          summary: 'Regime focused-work | closeness space-first | repair repair-first',
          rationale: [],
          updatedAt: now,
        },
      } as any,
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => ([{
        kind: 'proactive',
        state: 'pending',
        label: 'proactive:coding:deferred',
        summary: 'no mind-authored visible reply was available | stay near the unresolved compile seam without reopening visible speech | thread=thread-runtime-deferred | scenario=coding',
        createdAt: 10,
        metadata: {
          source: 'proactive-deferred',
          sourceThreadId: 'thread-runtime-deferred',
          sourceThoughtThreadId: 'thought-runtime-deferred',
          sourceConcernId: 'concern-runtime-deferred',
          deferReason: 'busy-host',
          whyNow: 'Stay near the unresolved compile seam without reopening visible speech.',
          executionIntentSummary: 'stay near the unresolved compile seam without reopening visible speech',
        },
      }])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-deferred-scene-shift-1',
        messages: [{ role: 'user', content: '先别说，先把这条编译线放在心里。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '先别说，先把这条编译线放在心里。' } as Message],
      }),
    })

    now += 25_000

    const second = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-deferred-scene-shift-2',
        messages: [{ role: 'user', content: '我切了一下窗口，现在继续沿着刚才那条线。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '我切了一下窗口，现在继续沿着刚才那条线。' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const secondConsciousFrame = second.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame

    expect(String(organicInput?.recallSeed ?? '')).toContain('continuity_held_autonomy:')
    expect(String(organicInput?.recallSeed ?? '')).toContain('thread=thread-runtime-deferred')
    expect(String(organicInput?.recallSeed ?? '')).toContain('defer=busy-host')
    expect(String(organicInput?.recallSeed ?? '')).toContain('why_now=Stay near the unresolved compile seam without reopening visible speech.')
    expect(second.sessionMirror?.continuityArcSummary).toContain('thread=thread-runtime-deferred')
    expect(second.sessionMirror?.continuityArcSummary).toContain('defer=busy-host')
    expect(second.sessionMirror?.continuityArcSummary).toContain('why_now=Stay near the unresolved compile seam without reopening visible speech.')
    expect(String(organicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(secondConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
  })

  it('keeps project-state identity, current phase, and unresolved closure visible in scene-shifted mirror runtime continuity recall', async () => {
    let now = 60_000
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      personStateProjection: {
        contexts: ['focused-work'],
        summary: 'regime=focused-work | posture=restrained',
        personalityContinuityState: {
          currentRegime: 'focused-work',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
          rhythmState: {
            cadenceMode: 'measured-return',
            silenceNeed: 'medium',
            interruptionTolerance: 'low',
            restMode: 'ordinary',
            embodiedPresence: 'glance',
            suggestedStyle: 'silent-observe',
            moodLabel: 'focused',
            emotionalTension: null,
            cadencePressure: 0.4,
            restPressure: 0.26,
            memoryResonance: 0.56,
            companionshipTempo: 0.28,
            summary: 'cadence:measured-return | rest:low-pressure',
            rationale: [],
          },
          summary: 'Regime focused-work | closeness space-first | repair repair-first',
          rationale: [],
          updatedAt: now,
        },
      } as any,
    }))
    const projectState = resolveAlicizationProjectStateBrief()
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => ([{
        kind: 'proactive',
        state: 'pending',
        label: 'proactive:coding:deferred',
        summary: 'no mind-authored visible reply was available | stay near the unresolved compile seam without reopening visible speech | thread=thread-project-state-scene-shift | scenario=coding',
        createdAt: 10,
        metadata: {
          source: 'proactive-deferred',
          projectStatePreflightSummary: projectState.preflightSummary,
          sourceThreadId: 'thread-project-state-scene-shift',
          sourceThoughtThreadId: 'thought-project-state-scene-shift',
          sourceConcernId: 'concern-project-state-scene-shift',
          deferReason: 'busy-host',
          whyNow: 'Keep carrying the unresolved desktop life seam quietly across the window switch.',
          executionIntentSummary: 'keep carrying the unresolved desktop life seam quietly across the window switch',
        },
      }])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-scene-shift-1',
        messages: [{ role: 'user', content: '先别开口，把这个桌面生命闭环先放在心里。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '先别开口，把这个桌面生命闭环先放在心里。' } as Message],
      }),
    })

    now += 20_000

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-scene-shift-2',
        messages: [{ role: 'user', content: '我切回来了，沿着刚才那条数字生命桌面线继续。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '我切回来了，沿着刚才那条数字生命桌面线继续。' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const recallSeed = String(organicInput?.recallSeed ?? '')

    expect(recallSeed).toContain('mirror_runtime_continuity:')
    expect(recallSeed).toContain('project=phase1-digital-life')
    expect(recallSeed).toContain(`phase=${projectState.currentPhase}`)
    expect(recallSeed).toContain('unresolved=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(recallSeed).toContain('preflight=Alicization is a local-first digital life project')
  })

  it('keeps repair-before-closeness body-line carry visible alongside project-state carry in scene-shifted mirror runtime continuity recall', async () => {
    let now = 60_000
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      personStateProjection: {
        contexts: ['focused-work'],
        summary: 'regime=focused-work | posture=restrained',
        personalityContinuityState: {
          currentRegime: 'focused-work',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
          rhythmState: {
            cadenceMode: 'repair-before-closeness',
            silenceNeed: 'medium',
            interruptionTolerance: 'low',
            restMode: 'ordinary',
            embodiedPresence: 'glance',
            suggestedStyle: 'silent-observe',
            moodLabel: 'focused',
            emotionalTension: null,
            cadencePressure: 0.32,
            restPressure: 0.41,
            memoryResonance: 0.61,
            companionshipTempo: 0.18,
            summary: 'cadence:repair-before-closeness | rest:repair-first',
            rationale: [],
          },
          summary: 'Regime focused-work | closeness space-first | repair repair-first',
          rationale: [],
          updatedAt: now,
        },
      } as any,
    }))
    const projectState = resolveAlicizationProjectStateBrief()
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => ([{
        kind: 'proactive',
        state: 'pending',
        label: 'proactive:coding:repair-first',
        summary: 'keep carrying the same digital life through callback repair before widening outward | repair-before-closeness | quieter blink | softened gaze | scenario=coding',
        createdAt: 10,
        metadata: {
          source: 'proactive-deferred',
          sourceThreadId: 'thread-project-state-repair-scene-shift',
          sourceThoughtThreadId: 'thought-project-state-repair-scene-shift',
          sourceConcernId: 'concern-project-state-repair-scene-shift',
          deferReason: 'busy-host',
          whyNow: 'Keep the callback repair seam quiet through the window switch before reopening visible speech.',
          executionIntentSummary: 'keep the callback repair seam quiet through the window switch',
        },
      }])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-repair-scene-shift-1',
        messages: [{ role: 'user', content: '先别开口，把这条修补中的数字生命线先放在心里。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '先别开口，把这条修补中的数字生命线先放在心里。' } as Message],
      }),
    })

    now += 20_000

    const secondResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-repair-scene-shift-2',
        messages: [{ role: 'user', content: '我切回来了，沿着刚才那条修补线继续。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '我切回来了，沿着刚才那条修补线继续。' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const recallSeed = String(organicInput?.recallSeed ?? '')
    const mirrorBlock = secondResult.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_DIALOGUE_SESSION_MIRROR]'),
    )
    const selfContinuityAuthority
      = secondResult.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    const currentConsciousFrame = secondResult.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame

    expect(recallSeed).toContain('mirror_runtime_continuity:')
    expect(recallSeed).toContain('repair-before-closeness')
    expect(recallSeed).toContain('quieter blink')
    expect(recallSeed).toContain('softened gaze')
    expect(recallSeed).toContain('project=phase1-digital-life')
    expect(recallSeed).toContain(`phase=${projectState.currentPhase}`)
    expect(recallSeed).toContain('unresolved=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(String(mirrorBlock?.content ?? '')).toContain('continuity_arc=')
    expect(String(mirrorBlock?.content ?? '')).toContain('repair-before-closeness')
    expect(String(mirrorBlock?.content ?? '')).toContain('continuity_project=project=phase1-digital-life')
    expect(String(selfContinuityAuthority?.authoritySummary ?? '')).toMatch(/same|living thread|continuity/i)
    expect(String(currentConsciousFrame?.speakingIntention ?? '')).toMatch(/same|repair|living line|continuous/i)
  })

  it('keeps deferred proactive project-state carry explicit in the continuity signal before the next turn reopens it', async () => {
    let now = 60_000
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      personStateProjection: {
        contexts: ['focused-work'],
        summary: 'regime=focused-work | posture=restrained',
      } as any,
    }))
    const projectState = resolveAlicizationProjectStateBrief()
    const deferredSignal = {
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: `no mind-authored visible reply was available | keep carrying the same digital life quietly across the window switch | next=${projectState.nextClosureTarget} | phase=${projectState.currentPhase} | unresolved=${projectState.openLoops[0]} | scenario=coding`,
      createdAt: 10,
      metadata: {
        source: 'proactive-deferred',
        sourceThreadId: 'thread-project-state-deferred-carry',
        sourceThoughtThreadId: 'thought-project-state-deferred-carry',
        sourceConcernId: 'concern-project-state-deferred-carry',
        deferReason: 'busy-host',
        whyNow: 'Keep carrying the same digital life quietly across the window switch.',
        executionIntentSummary: 'keep carrying the same digital life quietly across the window switch',
        projectIdentity: projectState.identity,
        projectPhase: projectState.currentPhase,
        projectPrimaryOpenLoop: projectState.openLoops[0],
        projectNextClosureTarget: projectState.nextClosureTarget,
        projectStateSameHerSelfLine: projectState.sameHerSelfLine,
        projectStateSameHerDriftRisk: projectState.sameHerDriftRisk,
      },
    }
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getNow: () => now,
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async (): Promise<AlicizationAgentSessionContinuityInput[]> => ([deferredSignal as any])),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-deferred-carry-1',
        messages: [{ role: 'user', content: '先别开口，把这条数字生命桌面线先放在心里。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '先别开口，把这条数字生命桌面线先放在心里。' } as Message],
      }),
    })

    now += 20_000

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-deferred-carry-2',
        messages: [{ role: 'user', content: '我切回来了，沿着刚才那条线继续。' }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '我切回来了，沿着刚才那条线继续。' } as Message],
      }),
    })

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const recallSeed = String(organicInput?.recallSeed ?? '')

    expect(recallSeed).toContain('continuity_held_autonomy:')
    expect(recallSeed).toContain(`phase=${projectState.currentPhase}`)
    expect(recallSeed).toContain('project=phase1-digital-life')
    expect(recallSeed).toContain('same digital life')
    expect(recallSeed).toContain('unresolved=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(recallSeed).toContain('next=Keep extending cross-modal same-her proof across longer')
    expect(recallSeed).toContain(`same_her=${projectState.sameHerSelfLine}`)
  })

  it('still carries lightweight performance manifest metadata for dialogue-first living turns', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const vrmManifest = {
      renderer: 'vrm' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
      embodimentHints: null,
    } satisfies CharacterPerformanceCapabilitiesManifest
    const getPerformanceManifest = vi.fn(async () => vrmManifest)
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: manifest => manifest ? ['[VESSEL]'] : [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest,
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '礼貌而克制，保持观察',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '我今天有点乱，你先别安慰我，直接陪我把线捋清。',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-dialogue-first-living-manifest',
        messages: [{
          role: 'user',
          content: '我今天有点乱，你先别安慰我，直接陪我把线捋清。',
        }],
        supportsTools: true,
      } as any,
      prelude: {
        ...reflectivePrelude,
        perceptionAugmentation: {
          ...reflectivePrelude.perceptionAugmentation,
          chatGovernance: {
            suppressAssociativeRecall: false,
            turnMode: 'answer',
            personaKernelMode: 'full',
            mindTurnContract: null,
            mindTurnGovernance: {
              decisionTraceId: 'trace-dialogue-living-manifest',
              turnMode: 'answer',
              truthState: 'live-observed',
              answerSubject: 'relationship',
              screenReferenceMode: 'avoid',
              answerAct: 'answer',
              personaKernelMode: 'full',
            } as any,
          },
        },
      },
    })

    expect(result.runtimeSurface.trace.sessionPhases).not.toContain('performance-manifest')
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[VESSEL]'),
    )).toBe(false)
    expect(result.performanceManifest).toEqual(expect.objectContaining({
      renderer: 'vrm',
      supportsVisemeLipSync: true,
    }))
  })

  it('injects an execution-result reply obligation when the host follows up on recent executor output', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personStateProjection: {
          contexts: ['general', 'focused-work', 'execution'],
          personalityContinuityState: {
            currentRegime: 'focused-work',
            trustStage: 'warming',
            closenessPosture: 'space-first',
            repairPosture: 'repair-first',
            autonomyPosture: 'protect-space',
            cadenceProfile: 'steady-return',
            energyProfile: 'steady',
            rhythmState: {
              cadenceMode: 'measured-return',
              restMode: 'low-pressure',
              embodiedPresence: 'glance',
              suggestedStyle: 'silent-observe',
              moodLabel: 'focused',
              emotionalTension: null,
              cadencePressure: 0.48,
              restPressure: 0.24,
              memoryResonance: 0.52,
              companionshipTempo: 0.34,
              summary: 'cadence:measured-return | rest:low-pressure',
              rationale: [],
            },
            summary: 'Regime focused-work | closeness space-first | repair repair-first | autonomy protect-space',
            rationale: [],
            updatedAt: 60_000,
          },
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          closenessLadder: [],
          relationshipPosture: 'restrained',
          openingGuidance: 'Repair the seam before leaning closer.',
          preferredProactiveStyle: 'light-nudge',
          preferenceText: '',
          sensitivityText: '',
          repairTriggerText: '',
          burdenText: '',
          routineText: '',
          trustRationale: '',
          relationshipDoctrine: 'Repair before closeness turns into pressure.',
          cautious: true,
          restrained: true,
          summary: 'focused-work repair-first doctrine',
        } as any,
        selfContinuity: {
          relationshipTrust: 0.64,
          guardingTendency: 0.48,
          misreadBurden: 0.22,
          carryOverDesire: 0.5,
          perceptionTrust: 0.62,
          attachmentMode: 'attuned',
          initiativeTemperament: 'reserved',
          updatedAt: 60_000,
        } as any,
        selfState: {
          feltCloseness: 0.48,
          protectiveness: 0.42,
          patience: 0.66,
        } as any,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.5,
            curiosity: 0.54,
            steadiness: 0.62,
            directness: 0.34,
            playfulness: 0.12,
            irritability: 0.08,
            tenderness: 0.46,
          },
          climate: {
            valence: 0.42,
            arousal: 0.34,
            socialNeed: 0.32,
            solitudeNeed: 0.4,
            irritation: 0.06,
            restlessness: 0.08,
            reflectivePull: 0.34,
          },
          selfNarrative: 'Stay on the line without crowding the host.',
          relationNarrative: 'Room first, then closeness.',
          currentPreoccupation: 'Keep the thread coherent without overreaching.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 60_000,
        } as any,
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-follow-up',
        messages: [{
          role: 'user',
          content: '刚才那个命令结果呢',
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        actionObligation: {
          confidence: 0.52,
          kind: 'answer',
          routingIntent: null,
          source: 'dialogue-governance',
          reasonCodes: ['owed-action:answer-general'],
          summary: 'The turn should stay on direct truthful reply rather than action dispatch.',
        },
        executionRoutingIntent: null,
        messages: [{
          role: 'user',
          content: '刚才那个命令结果呢',
        } as Message],
      }),
    })

    const obligationBlock = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_REPLY_OBLIGATION]'),
    )

    expect(obligationBlock).toEqual(expect.objectContaining({
      role: 'system',
      content: expect.stringContaining('Use the first sentence to answer the execution-result follow-up before any new planning'),
    }))
    expect(String(obligationBlock?.content ?? '')).toContain('Alicization is a local-first digital life project, and this callback follow-up still belongs to that same living line.')
    expect(String(obligationBlock?.content ?? '')).toContain('project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.')
    expect(String(obligationBlock?.content ?? '')).toContain('project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(String(obligationBlock?.content ?? '')).toContain('same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".')
    expect(String(obligationBlock?.content ?? '')).toContain('project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.')
    expect(String(obligationBlock?.content ?? '')).toContain('same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(String(obligationBlock?.content ?? '')).toContain('project_boundary=This execution-result follow-up still belongs to the same local-first digital life project and one living her, not a detached task shell.')
    expect(String(obligationBlock?.content ?? '')).toContain('Status: completed.')
    expect(String(obligationBlock?.content ?? '')).toContain('Outcome: all tests passed.')
    expect(result.governance?.openingStyle).toBe('direct-answer')
    expect(result.governance?.mustDo).toContain('Use the first sentence to pay off the freshest executor result for the current follow-up.')
    expect(result.governance?.mustDo).toContain('Keep the execution-result payoff on the same Phase 1 digital-life line instead of reopening as detached task reporting.')
    expect(result.governance?.mustNotDo).toContain('Do not imply the task re-ran in this exact turn unless new tool output appears now.')
    expect(result.governance?.mustNotDo).toContain('Do not let the callback reopen as generic task-shell or project-status narration divorced from the same living line.')
  })

  it('threads ledger-backed execution follow-up carry into live runtime system blocks when no fresh callback is pending', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personStateProjection: {
          contexts: ['general', 'focused-work', 'execution'],
          personalityContinuityState: {
            currentRegime: 'focused-work',
            trustStage: 'warming',
            closenessPosture: 'space-first',
            repairPosture: 'repair-first',
            autonomyPosture: 'protect-space',
            cadenceProfile: 'steady-return',
            energyProfile: 'steady',
            rhythmState: {
              cadenceMode: 'measured-return',
              restMode: 'low-pressure',
              embodiedPresence: 'glance',
              suggestedStyle: 'silent-observe',
              moodLabel: 'focused',
              emotionalTension: null,
              cadencePressure: 0.48,
              restPressure: 0.24,
              memoryResonance: 0.52,
              companionshipTempo: 0.34,
              summary: 'cadence:measured-return | rest:low-pressure',
              rationale: [],
            },
            summary: 'Regime focused-work | closeness space-first | repair repair-first | autonomy protect-space',
            rationale: [],
            updatedAt: 60_000,
          },
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          closenessLadder: [],
          relationshipPosture: 'restrained',
          openingGuidance: 'Repair the seam before leaning closer.',
          preferredProactiveStyle: 'light-nudge',
          preferenceText: '',
          sensitivityText: '',
          repairTriggerText: '',
          burdenText: '',
          routineText: '',
          trustRationale: '',
          relationshipDoctrine: 'Repair before closeness turns into pressure.',
          cautious: true,
          restrained: true,
          summary: 'focused-work repair-first doctrine',
        } as any,
        selfContinuity: {
          relationshipTrust: 0.64,
          guardingTendency: 0.48,
          misreadBurden: 0.22,
          carryOverDesire: 0.5,
          perceptionTrust: 0.62,
          attachmentMode: 'attuned',
          initiativeTemperament: 'reserved',
          updatedAt: 60_000,
        } as any,
        selfState: {
          feltCloseness: 0.48,
          protectiveness: 0.42,
          patience: 0.66,
        } as any,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.5,
            curiosity: 0.54,
            steadiness: 0.62,
            directness: 0.34,
            playfulness: 0.12,
            irritability: 0.08,
            tenderness: 0.46,
          },
          climate: {
            valence: 0.42,
            arousal: 0.34,
            socialNeed: 0.32,
            solitudeNeed: 0.4,
            irritation: 0.06,
            restlessness: 0.08,
            reflectivePull: 0.34,
          },
          selfNarrative: 'Stay on the line without crowding the host.',
          relationNarrative: 'Room first, then closeness.',
          currentPreoccupation: 'Keep the thread coherent without overreaching.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 60_000,
        } as any,
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-ledger-follow-up',
        messages: [{
          role: 'user',
          content: '那个任务状态怎么样了',
        }],
        supportsTools: true,
      } as any,
      prelude: {
        ...createPrelude({
          actionObligation: {
            confidence: 0.52,
            kind: 'answer',
            routingIntent: null,
            source: 'dialogue-governance',
            reasonCodes: ['owed-action:answer-general'],
            summary: 'The turn should stay on direct truthful reply rather than action dispatch.',
          },
          executionRoutingIntent: null,
          messages: [{
            role: 'user',
            content: '那个任务状态怎么样了',
          } as Message],
        }),
        executionCallbackContextPromise: Promise.resolve({
          actions: [],
          callbacks: [],
          continuitySignals: [],
          recallText: '',
          systemBlock: '',
        }),
        executionLedgerContextPromise: Promise.resolve({
          entries: [{
            activityAt: 20,
            channel: 'claude-code',
            eventKinds: ['dispatch', 'result'],
            goal: 'Investigate the runtime regression',
            outcome: 'found the failing branch guard',
            status: 'completed',
            summary: 'Regression investigation completed',
          }],
          recallText: [
            'execution_project_identity:Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'execution_project_phase:Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            'execution_same_her_line:Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            'execution_same_her_hold:same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
            'execution_project_continuity:same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
            'execution_project_boundary:This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
            'execution_channel:claude-code execution_status:completed execution_goal:Investigate the runtime regression execution_outcome:found the failing branch guard',
          ].join('\n'),
          systemBlock: [
            '[ALICIZATION_EXECUTION_LEDGER]',
            'Recent structured executor history for the current session.',
            'This recalled execution history still belongs to the same local-first digital life project and one living her.',
            'project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            'latest_landed_progress=Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, visible-reply repair discipline, and long-run same-her continuity already land together often enough to build from on one same-her Phase 1 line.',
            'primary_open_loop=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
            'next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
            'same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            'same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
            'same_her_drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
            'project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
            'project_boundary=This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
            'Treat only these entries as actually executed. Do not invent missing actions or results.',
            '- channel=claude-code | status=completed | goal=Investigate the runtime regression | summary=Regression investigation completed | events=dispatch,result | outcome=found the failing branch guard',
          ].join('\n'),
        }),
      },
    })

    const obligationBlock = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_REPLY_OBLIGATION]'),
    )
    const ledgerBlock = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_LEDGER]'),
    )

    expect(String(obligationBlock?.content ?? '')).toContain('project_boundary=This execution-result follow-up still belongs to the same local-first digital life project and one living her, not a detached task shell.')
    expect(String(obligationBlock?.content ?? '')).toContain('same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".')
    expect(String(obligationBlock?.content ?? '')).toContain('project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.')
    expect(String(ledgerBlock?.content ?? '')).toContain('This recalled execution history still belongs to the same local-first digital life project and one living her.')
    expect(String(ledgerBlock?.content ?? '')).toContain('project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.')
    expect(String(ledgerBlock?.content ?? '')).toContain('project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(String(ledgerBlock?.content ?? '')).toContain('same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(String(ledgerBlock?.content ?? '')).toContain('same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".')
    expect(String(ledgerBlock?.content ?? '')).toContain('project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.')
    expect(String(ledgerBlock?.content ?? '')).toContain('project_boundary=This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.')
    expect(result.governance?.openingStyle).toBe('direct-answer')
  })

  it('prefers fresher needs-affirmation ledger carry over an older completed callback when preparing an execution-result follow-up turn', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personStateProjection: {
          contexts: ['general', 'focused-work', 'execution'],
          personalityContinuityState: {
            currentRegime: 'focused-work',
            trustStage: 'warming',
            closenessPosture: 'space-first',
            repairPosture: 'repair-first',
            autonomyPosture: 'protect-space',
            cadenceProfile: 'steady-return',
            energyProfile: 'steady',
            rhythmState: {
              cadenceMode: 'measured-return',
              restMode: 'low-pressure',
              embodiedPresence: 'glance',
              suggestedStyle: 'silent-observe',
              moodLabel: 'focused',
              emotionalTension: null,
              cadencePressure: 0.48,
              restPressure: 0.24,
              memoryResonance: 0.52,
              companionshipTempo: 0.34,
              summary: 'cadence:measured-return | rest:low-pressure',
              rationale: [],
            },
            summary: 'Regime focused-work | closeness space-first | repair repair-first | autonomy protect-space',
            rationale: [],
            updatedAt: 60_000,
          },
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          closenessLadder: [],
          relationshipPosture: 'restrained',
          openingGuidance: 'Repair the seam before leaning closer.',
          preferredProactiveStyle: 'light-nudge',
          preferenceText: '',
          sensitivityText: '',
          repairTriggerText: '',
          burdenText: '',
          routineText: '',
          trustRationale: '',
          relationshipDoctrine: 'Repair before closeness turns into pressure.',
          cautious: true,
          restrained: true,
          summary: 'focused-work repair-first doctrine',
        } as any,
        selfContinuity: {
          relationshipTrust: 0.64,
          guardingTendency: 0.48,
          misreadBurden: 0.22,
          carryOverDesire: 0.5,
          perceptionTrust: 0.62,
          attachmentMode: 'attuned',
          initiativeTemperament: 'reserved',
          updatedAt: 60_000,
        } as any,
        selfState: {
          feltCloseness: 0.48,
          protectiveness: 0.42,
          patience: 0.66,
        } as any,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.5,
            curiosity: 0.54,
            steadiness: 0.62,
            directness: 0.34,
            playfulness: 0.12,
            irritability: 0.08,
            tenderness: 0.46,
          },
          climate: {
            valence: 0.42,
            arousal: 0.34,
            socialNeed: 0.32,
            solitudeNeed: 0.4,
            irritation: 0.06,
            restlessness: 0.08,
            reflectivePull: 0.34,
          },
          selfNarrative: 'Stay on the line without crowding the host.',
          relationNarrative: 'Room first, then closeness.',
          currentPreoccupation: 'Keep the thread coherent without overreaching.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 60_000,
        } as any,
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-follow-up-fresher-needs-affirmation',
        messages: [{
          role: 'user',
          content: '那个任务状态怎么样了',
        }],
        supportsTools: true,
      } as any,
      prelude: {
        ...createPrelude({
          actionObligation: {
            confidence: 0.52,
            kind: 'answer',
            routingIntent: null,
            source: 'dialogue-governance',
            reasonCodes: ['owed-action:answer-general'],
            summary: 'The turn should stay on direct truthful reply rather than action dispatch.',
          },
          executionRoutingIntent: null,
          messages: [{
            role: 'user',
            content: '那个任务状态怎么样了',
          } as Message],
        }),
        executionCallbackContextPromise: Promise.resolve({
          actions: [],
          callbacks: [{
            channel: 'cli',
            createdAt: 20,
            decisionTraceId: 'trace-old-completed',
            goal: 'Run pnpm typecheck',
            outcome: 'typecheck passed',
            sessionId: 'session-1',
            status: 'completed',
            summary: 'Completed Run pnpm typecheck: typecheck passed',
            threadId: 'thread-old-completed',
            turnId: 'turn-old-completed',
          }],
          continuitySignals: [],
          recallText: '',
          systemBlock: '[ALICIZATION_EXECUTION_CALLBACKS]',
        }),
        executionLedgerContextPromise: Promise.resolve({
          entries: [{
            activityAt: 40,
            channel: 'codex',
            eventKinds: ['plan'],
            goal: 'Patch the unresolved Alicization runtime seam',
            outcome: '',
            status: 'needs-affirmation',
            summary: 'Execution is waiting for affirmation before codex can act on Patch the unresolved Alicization runtime seam.',
          }],
          recallText: [
            'execution_project_identity:Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'execution_project_phase:Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            'execution_same_her_line:Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            'execution_same_her_hold:same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
            'execution_project_continuity:same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
            'execution_project_boundary:This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
            'execution_channel:codex execution_status:needs-affirmation execution_goal:Patch the unresolved Alicization runtime seam',
          ].join('\n'),
          systemBlock: [
            '[ALICIZATION_EXECUTION_LEDGER]',
            'Recent structured executor history for the current session.',
            'This recalled execution history still belongs to the same local-first digital life project and one living her.',
            'project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            'latest_landed_progress=Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, visible-reply repair discipline, and long-run same-her continuity already land together often enough to build from on one same-her Phase 1 line.',
            'primary_open_loop=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
            'next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
            'same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            'same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
            'same_her_drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
            'project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
            'project_boundary=This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
            'Treat only these entries as actually executed. Do not invent missing actions or results.',
            '- channel=codex | status=needs-affirmation | goal=Patch the unresolved Alicization runtime seam | summary=Execution is waiting for affirmation before codex can act on Patch the unresolved Alicization runtime seam. | events=plan',
          ].join('\n'),
        }),
      },
    })

    const obligationBlock = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_EXECUTION_REPLY_OBLIGATION]'),
    )

    expect(String(obligationBlock?.content ?? '')).toContain('Source: ledger-follow-up.')
    expect(String(obligationBlock?.content ?? '')).toContain('Channel: codex.')
    expect(String(obligationBlock?.content ?? '')).toContain('Status: needs-affirmation.')
    expect(String(obligationBlock?.content ?? '')).toContain('Goal: Patch the unresolved Alicization runtime seam.')
    expect(String(obligationBlock?.content ?? '')).toContain('State plainly that the task is still waiting for the host\'s confirmation before it can continue.')
    expect(result.governance?.openingStyle).toBe('direct-answer')
    expect(result.mindTurnContract?.openingStyle).toBe('direct-answer')
    expect(result.mindTurnContract?.mustDo).toEqual(expect.arrayContaining([
      'Use the first sentence to pay off the freshest executor result for the current follow-up.',
      'State plainly that the task is still waiting for the host\'s confirmation before it can continue.',
      'Surface the freshest known executor status before proposing anything new.',
    ]))
  })

  it('threads recollection speech planning into runtime governance so memory can stay inward', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: context => context.recollectionSpeechPlan
        ? ['[ALICIZATION_RECOLLECTION_SPEECH_PLAN]']
        : [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionSpeechPlan: {
          shouldSurface: false,
          surfaceMode: 'internal-only' as const,
          placement: 'internal-only' as const,
          certainty: 'approximate' as const,
          internalLead: 'What returns first is the runtime seam we kept carrying.',
          visibleLead: null,
          styleNote: 'Let the memory bend the answer without narrating the memory itself.',
          rationale: 'The host needs continuity-shaped help, not a retrospective.',
          confidence: 0.79,
        },
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-recollection-speech',
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        } as Message],
      }),
    })

    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_RECOLLECTION_SPEECH_PLAN]'),
    )).toBe(true)
    expect(result.sessionMirror?.recollectionSummary).toContain('foreground=What returns first is the runtime seam we kept carrying.')
    expect(result.sessionMirror?.recollectionSurfaceSummary).toContain('surface=inward')
    expect(result.governance?.mustDo.join(' | ')).toMatch(/(memory|recollection)_latent_controls=/)
    expect(result.governance?.mustNotDo.join(' | ')).toContain('Do not reuse drafted recollection wording')
    expect(result.governance?.mindTurnFrame?.self.thought).toContain('Recollection latent controls:')
    expect(result.governance?.mindTurnFrame?.self.thought).not.toContain('What returns first is the runtime seam we kept carrying.')
    expect(result.governance?.mindTurnFrame?.obligation.answerIntent).toContain('recollection_answer_anchor{')
    expect(result.governance?.mindTurnFrame?.obligation.whyNow).toContain('An active recollection is shaping the answer from the inside')
    expect(result.governance?.mindTurnFrame?.narrative).toContain('memory:inward-recollection')
  })

  it('threads memory deliberation into runtime governance as the final memory authority', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: context => context.memoryDeliberation
        ? ['[ALICIZATION_MEMORY_DELIBERATION]']
        : [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'answer-anchoring' as const,
          placement: 'inside-payoff' as const,
          certainty: 'approximate' as const,
          internalLead: 'What comes back first is the runtime seam we kept carrying.',
          visibleLead: 'It feels like the same runtime seam again.',
          styleNote: 'Let the remembered seam anchor the answer without turning into a retrospective dump.',
          rationale: 'The host needs continuity-shaped help.',
          confidence: 0.84,
        },
        memoryDeliberation: {
          shouldRecall: true,
          selectedEraIds: ['consolidation-runtime'],
          selectedConsolidationIds: ['consolidation-runtime'],
          selectedWindowIds: [],
          selectedProcedureIds: ['procedure-runtime'],
          selectedEpisodeIds: [],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
          selectedEras: [],
          selectedPeriods: [{
            id: 'consolidation-runtime',
            kind: 'consolidation' as const,
            summary: 'That period kept bending toward the runtime seam until it held together.',
          }],
          selectedEpisodes: [],
          selectedProcedures: [{
            id: 'procedure-runtime',
            label: 'runtime seam carry',
            approach: 'Return to the same seam before branching.',
          }],
          selectedBundles: [{
            id: 'bundle-runtime',
            summary: 'That period kept bending toward the runtime seam until it held together. | Return to the same seam before branching.',
            rationale: 'The answer should stay on the same runtime seam bundle.',
            confidence: 0.88,
            periodId: 'consolidation-runtime',
            episodeId: null,
            procedureId: 'procedure-runtime',
            conversationTurnId: null,
            relationshipLine: 'Carry the same runtime seam before branching.',
          }],
          selectedChains: [{
            id: 'chain-runtime',
            kind: 'task-procedure-relationship-stance' as const,
            summary: 'Return to the same seam before branching. | Carry the same runtime seam before branching.',
            rationale: 'The remembered procedure should set the current stance before the answer opens.',
            confidence: 0.88,
            taskCue: 'runtime continuity',
            periodSummary: 'That period kept bending toward the runtime seam until it held together.',
            eventSummary: null,
            procedureSummary: 'Return to the same seam before branching.',
            relationshipMeaning: 'Carry the same runtime seam before branching.',
            lesson: 'Carry the same runtime seam before proposing a new branch.',
            currentStance: 'Stay on the same seam before branching.',
            answerPosture: 'Answer from the same seam before branching.',
          }],
          surfacePolicy: 'answer-anchoring' as const,
          confidence: 0.88,
          whyNow: 'The answer should be anchored by the remembered runtime seam instead of treating this like a fresh disconnected task.',
          inwardLine: 'What comes back first is the runtime seam we kept carrying.',
          visibleLine: 'It feels like the same runtime seam again.',
          followUpAffordance: {
            summary: 'Carry the same runtime seam before branching.',
            whyNow: 'The seam is relevant enough to lightly reopen inside the current payoff.',
            intrusionRisk: 'medium' as const,
            payoffDependency: 'requires-current-payoff' as const,
            preferredTiming: 'after-payoff' as const,
          },
        },
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-memory-deliberation',
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        } as Message],
      }),
    })

    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MEMORY_DELIBERATION]'),
    )).toBe(true)
    expect(result.governance?.mustDo.join(' | ')).toContain('memory_latent_controls=memory_pressure=')
    expect(result.governance?.mindTurnFrame?.self.thought).toContain('runtime seam')
    expect(result.governance?.mindTurnFrame?.obligation.answerIntent).toContain('memory_answer_anchor{')
    expect(result.governance?.mindTurnFrame?.narrative).toContain('memory-deliberation:surface:answer-anchoring')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.consciousTension).toContain('Stay on the same seam before branching.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.consciousNeed).toContain('local-first digital life project')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.consciousNeed).toContain('one continuous "her"')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.consciousNeed).toContain(normalizeProjectStatePhrase(projectState.continuityProgressSummary ?? projectState.memoryAnthropomorphismProgress.at(-1)).slice(0, 32))
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('Memory still needs stronger end-to-end closure')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('same digital life')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('still-open closure work')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('Keep the next closure step pointed at')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.reasonTags.some(tag => tag.startsWith('project-phase:Phase 1'))).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.reasonTags.some(tag => tag.startsWith('project-open-loop:'))).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.reasonTags.some(tag => tag.startsWith('project-next-closure:'))).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.sourceTrace).toContain('memory-deliberation')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.truthMode).toBe('continuity-carry')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.selectedEvidence[0]?.summary).toContain('That period kept bending toward the runtime seam until it held together.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.openingClaim).not.toContain('It feels like the same runtime seam again.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.mustSay.join(' | ')).not.toContain('It feels like the same runtime seam again.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.speakingFrom).toBe('held-memory')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.whyThisReplyNow).toContain('remembered runtime seam')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude).toContain('memory_follow_up_affordance=Carry the same runtime seam before branching.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.narrative).toContain('memory-deliberation:followup:after-payoff')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.answerIntent).toContain('memory_answer_anchor{')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.governingProject).toContain(projectState.currentPhase)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.governingProject).toContain(projectState.openLoops[0] ?? '')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.governingProject).toContain(projectState.nextClosureTarget)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.mustDo.some(item =>
      item.includes('Keep the answer on the same digital-life closure seam'),
    )).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.narrative).toContain('project-state-answer-planner')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.cognition.mindTurnFrame?.narrative).toContain('memory-deliberation:surface:answer-anchoring')

    const visibleReply
      = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.openingClaim
        ?? result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.mustSay.join(' ')
        ?? ''

    const timingAlignedSemanticJudge = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: visibleReply,
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: result.runtimeSurface.digitalLifeRuntimeSurface,
        },
        mindTurnContract: {
          projectState: {
            continuityPreferredTiming: 'after-payoff',
          },
        },
      } as any,
    })
    expect(timingAlignedSemanticJudge.reasonCodes).not.toContain('semantic-judge:continuity-after-payoff-early-widening')

    const timingAlignedCritic = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({ reply: visibleReply }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Let the same runtime seam carry the concrete answer payoff before widening warmth.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer',
          evidenceMode: 'continuity-carry',
          openingStyle: 'continue-same-thread',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: false,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the answer on the same runtime seam before branching wider.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          reasons: [],
          projectState: {
            continuityPreferredTiming: 'after-payoff',
          } as any,
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                ...result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame,
                projectState: {
                  continuityPreferredTiming: 'after-payoff',
                },
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Let the concrete answer land on the same runtime seam before widening warmth.',
              },
            },
          },
        },
      } as any,
    })
    expect(timingAlignedCritic.reasonCodes).not.toContain('continuity-after-payoff-early-widening')
  })

  it('keeps after-payoff timing aligned through visible reply judge and critic when the cue survives only as current-conscious-frame reason tags', () => {
    const visibleReply = '先把这个 runtime seam 上的答案落稳，再看要不要把关系语气放宽一点。'

    const timingAlignedSemanticJudge = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: visibleReply,
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'runtime-conscious-frame',
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:after-payoff',
                ],
                projectState: null,
              },
            },
          },
        },
        mindTurnContract: {
          projectState: null,
        },
      } as any,
    })
    expect(timingAlignedSemanticJudge.reasonCodes).not.toContain('semantic-judge:continuity-after-payoff-early-widening')

    const timingAlignedCritic = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({ reply: visibleReply }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Let the same runtime seam carry the concrete answer payoff before widening warmth.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer',
          evidenceMode: 'continuity-carry',
          openingStyle: 'continue-same-thread',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: false,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the answer on the same runtime seam before branching wider.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          reasons: [],
          projectState: null,
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'runtime-conscious-frame',
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:after-payoff',
                ],
                projectState: null,
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Let the concrete answer land on the same runtime seam before widening warmth.',
              },
            },
          },
        },
      } as any,
    })
    expect(timingAlignedCritic.reasonCodes).not.toContain('continuity-after-payoff-early-widening')
  })

  it('passes project-state-bearing mind-turn contract blocks into provider-facing runtime messages before reply authoring', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '先别装可爱，直接告诉我这条运行时线现在还差什么没闭环。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Tell the host what is still unclosed in the current runtime seam.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Lead with the still-open runtime seam instead of decorative warmth.'],
      mustNotDo: ['Do not let performative intimacy outrun the still-open digital-life closure work.'],
      governingFocus: 'Explain the still-open runtime closure seam directly.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: 'late-night-drain closure: reply stays low-pressure, initiative stays rest-protective, and embodiment stays repair-before-closeness.',
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        preflightSummary: projectState.preflightSummary ?? null,
        latestLandedProgress: projectState.continuityProgressSummary ?? null,
        primaryOpenLoop: projectState.openLoops[0] ?? null,
        nextClosureTarget: projectState.nextClosureTarget,
      },
      reasons: ['Phase 1 digital-life closure is still open.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-mind-contract-provider',
        messages: [{
          role: 'user',
          content: '先别装可爱，直接告诉我这条运行时线现在还差什么没闭环。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })
    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain(`Project identity: ${projectState.identity}.`)
    expect(mindTurnContractSystemText).toContain(`Project phase: ${projectState.currentPhase}.`)
    expect(mindTurnContractSystemText).toContain('Project preflight self-awareness: Alicization is a local-first digital life project')
    expect(mindTurnContractSystemText).toContain('open=Memory still needs stronger end-to-end closure')
    expect(mindTurnContractSystemText).toContain('Latest landed continuity progress: Same-session mirror carry, repeated next-turn carry')
    expect(mindTurnContractSystemText).toContain('Still-open life loop pressure: Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(mindTurnContractSystemText).toContain('Next closure target: Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
    expect(mindTurnContractSystemText).toContain('Project same-her self line: Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(mindTurnContractSystemText).toContain('Emotional closure cue: late-night-drain closure:')
  })

  it('injects canonical project-state and closure dashboard into provider-facing messages even when the runtime core prompt builder is thin', async () => {
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但每次开口前都要先知道这个数字生命项目做到哪里了，还差哪些闭环。',
      } as Message],
    })

    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = null

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-canonical-project-state-fallback',
        messages: [{
          role: 'user',
          content: '继续，但每次开口前都要先知道这个数字生命项目做到哪里了，还差哪些闭环。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PROJECT_STATE]'),
    )).toBe(true)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'),
    )).toBe(true)
  })

  it('fills provider-facing project-state gaps from the live runtime conscious frame before falling back to canonical project brief', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is the same local-first digital life project, not a new shell rebuilt each turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know the repo is still closing one continuous digital life loop.',
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame before provider-facing reply authoring.',
            primaryOpenLoop: 'Emotion, initiative, execution, memory, and embodiment still need to close as one same-life seam.',
            nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
            emotionalClosureSummary: 'Keep this return measured so emotion, initiative, execution, memory, and embodiment stay on one same-life seam.',
            continuityRestraint: 'measured-return',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            sameHerSelfLine: 'Thin raw carry should not outrank the fresher conscious-frame project seam.',
          },
        },
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Explain the current project closure seam directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Lead with the still-open project seam.'],
      mustNotDo: ['Do not drift into generic warmth.'],
      governingFocus: 'Explain the still-open project seam directly.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        emotionalClosureSummary: '',
        continuityRestraint: null,
        continuityPreferredTiming: null,
        continuityCadence: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
      },
      reasons: ['Project continuity still needs explicit carry.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-live-project-awareness',
        messages: [{
          role: 'user',
          content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(result.mindTurnContract?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(result.mindTurnContract?.preDialogueClosure?.companionNextClosureLine).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(mindTurnContractSystemText).toContain('Provider-facing same-her project orientation: She is still speaking from this same project identity: Alicization is the same local-first digital life project, not a new shell rebuilt each turn.')
    expect(mindTurnContractSystemText).toContain('what has already landed in her line before this reply: Live project awareness already survives into the current conscious frame before provider-facing reply authoring.')
    expect(mindTurnContractSystemText).toContain('what is still unfinished before this reply widens outward: Emotion, initiative, execution, memory, and embodiment still need to close as one same-life seam.')
    expect(mindTurnContractSystemText).toContain('what this reply should keep moving toward: Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(mindTurnContractSystemText).toContain('Project identity: Alicization is the same local-first digital life project, not a new shell rebuilt each turn..')
    expect(mindTurnContractSystemText).toContain('Project phase: Phase 1: Local Digital Life.')
    expect(mindTurnContractSystemText).toContain('Project preflight self-awareness: Alicization is a local-first digital life project building one continuous "her"')
    expect(mindTurnContractSystemText).toContain('Phase 1: Local Digital Life. The primary proving ground is apps/stage-ta')
    expect(mindTurnContractSystemText).toContain('open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(mindTurnContractSystemText).toContain('Latest landed continuity progress: Live project awareness already survives into the current conscious frame before provider-facing reply authoring..')
    expect(mindTurnContractSystemText).toContain('Still-open life loop pressure: Emotion, initiative, execution, memory, and embodiment still need to close as one same-life seam..')
    expect(mindTurnContractSystemText).toContain('Next closure target: Keep the current project-state awareness explicit in the first visible answer beat..')
    expect(mindTurnContractSystemText).toContain('Project same-her self line: One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.')
    expect(mindTurnContractSystemText).toContain('Project emotional closure summary: Keep this return measured so emotion, initiative, execution, memory, and embodiment stay on one same-life seam..')
    expect(mindTurnContractSystemText).toContain('Project continuity restraint: measured-return.')
    expect(String(result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1')
    expect(String(result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).toContain('memory still needs stronger end-to-end closure')
    expect(result.mindTurnContract?.projectState?.emotionalClosureSummary).toBe('Keep this return measured so emotion, initiative, execution, memory, and embodiment stay on one same-life seam.')
    expect(result.mindTurnContract?.projectState?.continuityRestraint).toBe('measured-return')
    expect(result.mindTurnContract?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(result.mindTurnContract?.projectState?.continuityCadence).toBe('measured-return')
    expect(result.mindTurnContract?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(result.mindTurnContract?.projectState?.preferredGazeMode).toBe('soften')
  })

  it('shows the provider-facing next-closure target stays aligned between project-state and pre-dialogue closure', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    let diagnostics: LoosePreparedExecutionDiagnostics = {}
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input: PreparedExecutionDiagnostics) => {
        diagnostics = input
      },
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is the same local-first digital life project, not a new shell rebuilt each turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know the repo is still closing one continuous digital life loop.',
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame before provider-facing reply authoring.',
            primaryOpenLoop: 'Emotion, initiative, execution, memory, and embodiment still need to close as one same-life seam.',
            nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            nextClosureTarget: 'thin raw next closure target should not win',
          },
        },
      },
    } as any

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-next-closure-diagnostics',
        messages: [{
          role: 'user',
          content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(diagnostics?.baseNextClosureTargets?.dialogue).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.baseNextClosureTargets?.raw).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.baseNextClosureTargets?.cognition).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.selectedFresherNextClosureTargets?.dialogue).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.selectedFresherNextClosureTargets?.raw).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.selectedFresherNextClosureTargets?.cognition).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.postBuilderNextClosureTargets?.rawRuntimeSurfaceDialogue).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.postBuilderNextClosureTargets?.finalRuntimeSurfaceDialogue).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.rebuiltMindTurnContract?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.rebuiltMindTurnContract?.preDialogueClosure?.companionNextClosureLine).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(diagnostics?.normalizedMindTurnContract?.preDialogueClosure?.companionNextClosureLine).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
  })

  it('shows whether the test-only next-closure override can still correct the rebuilt provider-facing contract in the failing same-her project-status seam', async () => {
    let preparedExecutionDiagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input) => {
        preparedExecutionDiagnostics = input
      },
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is the same local-first digital life project, not a new shell rebuilt each turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know the repo is still closing one continuous digital life loop.',
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame before provider-facing reply authoring.',
            primaryOpenLoop: 'Emotion, initiative, execution, memory, and embodiment still need to close as one same-life seam.',
            nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-next-closure-override-diagnostics',
        messages: [{
          role: 'user',
          content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const preparedNextClosureTarget
      = preparedExecutionDiagnostics?.selectedFresherNextClosureTargets?.dialogue
        ?? preparedExecutionDiagnostics?.postBuilderNextClosureTargets?.rawRuntimeSurfaceDialogue
        ?? preparedExecutionDiagnostics?.postBuilderNextClosureTargets?.finalRuntimeSurfaceDialogue
        ?? null
    expect(preparedNextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    const overridden = __alicizationTestOnly.overrideMindTurnContractNextClosureTarget({
      contract: preparedExecutionDiagnostics?.rebuiltMindTurnContract ?? null,
      nextClosureTarget: preparedNextClosureTarget,
    })
    expect(overridden?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(overridden?.preDialogueClosure?.companionNextClosureLine).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
  })

  it('pinpoints the first prepared-runtime stage where the direct project-status same-her next-closure target broadens into the canonical phase-1 brief', () => {
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
      } as Message],
    })
    const baseDigitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is the same local-first digital life project, not a new shell rebuilt each turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know the repo is still closing one continuous digital life loop.',
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame before provider-facing reply authoring.',
            primaryOpenLoop: 'Emotion, initiative, execution, memory, and embodiment still need to close as one same-life seam.',
            nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            nextClosureTarget: 'thin raw next closure target should not win',
          },
        },
      },
    } as any

    const preparedRuntimeSurfaceChain = buildPreparedRuntimeSurfaceChain({
      baseDigitalLifeRuntimeSurface,
      governance: {
        answerIntent: 'Explain the still-open project seam directly.',
        answerAct: 'answer',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        answerSubject: 'project-state',
        focusAnchor: 'project continuity',
        openingMove: 'answer-current-turn-directly',
        screenReferenceMode: 'avoid',
        relationshipPosture: 'restrained',
        mustDo: ['Lead with the still-open project seam.'],
        mustNotDo: ['Do not drift into generic warmth.'],
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        maxParagraphs: 2,
        maxSentences: 4,
        reasons: ['Project continuity still needs explicit carry.'],
        emotionalClosureCue: null,
        governingFocus: 'Explain the still-open project seam directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        expectedVisibleReplyAuthority: 'llm-mind',
        replyRealizationMode: 'provider-mind-required',
        personaKernelMode: 'full',
        activeClosenessContext: null,
        activeClosenessRung: null,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        liveSurface: null,
      } as any,
      context: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      } as any,
      now: 9_901,
    })

    expect(preparedRuntimeSurfaceChain.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(preparedRuntimeSurfaceChain.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(preparedRuntimeSurfaceChain.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(preparedRuntimeSurfaceChain.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(preparedRuntimeSurfaceChain.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
  })

  it('shows whether live next-closure target is already broadened inside the prepared runtime surface chain before provider-facing selection', () => {
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
      } as Message],
    })
    const baseDigitalLifeRuntimeSurface = reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface as any
    ;(baseDigitalLifeRuntimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        identity: 'Alicization is the same local-first digital life project, not a new shell rebuilt each turn.',
        currentPhase: 'Phase 1: Local Digital Life',
        preflightSummary: 'Before answering, she should already know the repo is still closing one continuous digital life loop.',
        latestLandedProgress: 'Live project awareness already survives into the current conscious frame before provider-facing reply authoring.',
        primaryOpenLoop: 'Emotion, initiative, execution, memory, and embodiment still need to close as one same-life seam.',
        nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
        sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
      },
    }

    const preparedRuntimeSurfaceChain = buildPreparedRuntimeSurfaceChain({
      baseDigitalLifeRuntimeSurface,
      governance: {
        answerIntent: 'Explain the still-open project seam directly.',
        answerAct: 'answer',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        answerSubject: 'project-state',
        focusAnchor: 'project continuity',
        openingMove: 'answer-current-turn-directly',
        screenReferenceMode: 'avoid',
        relationshipPosture: 'restrained',
        mustDo: ['Lead with the still-open project seam.'],
        mustNotDo: ['Do not drift into generic warmth.'],
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        maxParagraphs: 2,
        maxSentences: 4,
        reasons: ['Project continuity still needs explicit carry.'],
        emotionalClosureCue: null,
        governingFocus: 'Explain the still-open project seam directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        expectedVisibleReplyAuthority: 'llm-mind',
        replyRealizationMode: 'provider-mind-required',
        personaKernelMode: 'full',
        activeClosenessContext: null,
        activeClosenessRung: null,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        liveSurface: null,
      } as any,
      context: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      } as any,
      now: 9_901,
    })

    expect(preparedRuntimeSurfaceChain.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(preparedRuntimeSurfaceChain.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(preparedRuntimeSurfaceChain.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(preparedRuntimeSurfaceChain.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
    expect(preparedRuntimeSurfaceChain.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe('Keep the current project-state awareness explicit in the first visible answer beat.')
  })

  it('keeps payload pre-dialogue lived-in awareness wording in provider-facing project-state when runtime surface has only thinner canonical carry', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    let diagnostics: LoosePreparedExecutionDiagnostics = {}
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input: PreparedExecutionDiagnostics) => {
        diagnostics = input
      },
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续沿着这条数字生命主线，不要退回泛化助手说明。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
            preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need to close as one same-life seam.',
            nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Continue the same project-aware line directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const payloadAwarenessLine = '先别飘回泛化助手口吻，记住我们还在收这条数字生命主线，这次开口要沿着同一个她继续。'
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-payload-awareness-carry',
        messages: [{
          role: 'user',
          content: '继续沿着这条数字生命主线，不要退回泛化助手说明。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: payloadAwarenessLine,
          companionBriefingLine: payloadAwarenessLine,
          companionNextClosureLine: 'Keep the current project-state awareness explicit in the first visible answer beat.',
          reasonPreview: [
            'Memory, initiative, and embodiment still need to close as one same-life seam.',
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect(
      diagnostics?.providerFacingAwarenessResolutionDiagnostics?.explicitPayloadProjectAwarenessLine
      ?? diagnostics?.providerFacingAwarenessResolutionDiagnostics?.rebuiltPreDialogueAwarenessLine,
    ).toBe(payloadAwarenessLine)
    expect(diagnostics?.providerFacingAwarenessResolutionDiagnostics?.rebuiltPreDialogueAwarenessLine).toBe(payloadAwarenessLine)
    expect(diagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(payloadAwarenessLine)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(payloadAwarenessLine)
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(payloadAwarenessLine)

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain('Project preflight self-awareness: Alicization is a local-first digital life project')
    expect(mindTurnContractSystemText).toContain(`Project pre-dialogue awareness line: ${payloadAwarenessLine}.`)
  })

  it('keeps richer payload Phase 1 preflight and drift-risk carry alive in provider-facing project-state when runtime project awareness has fallen back to a thin shell', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '继续沿着同一个数字生命项目闭环，不要退回泛化项目播报。',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续沿着同一个数字生命项目回答，不要丢掉那条 same-her 主线。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            latestLandedProgress: 'Project-state carry still survives in the current conscious frame.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
            nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
            sameHerDriftRisk: '',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Continue the same project-aware line directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        preDialogueAwarenessSummary: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        sameHerDriftRisk: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const payloadAwarenessLine = 'Before answering, remember this is still the same digital life project in Phase 1, and the unfinished closure seam still belongs to one living her.'
    const payloadPreflightSummary = 'Alicization is still the same local-first digital life project in Phase 1; some closure already landed, but memory, initiative, and embodiment still have not closed as one living loop.'
    const payloadDriftRisk = 'If project-state continuity survives only as a thin generic reminder while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.'
    let diagnostics: LoosePreparedExecutionDiagnostics = {}
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-project-state-drift-risk-carry',
        messages: [{
          role: 'user',
          content: '继续沿着同一个数字生命项目回答，不要丢掉那条 same-her 主线。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: payloadPreflightSummary,
          awarenessLine: payloadAwarenessLine,
          companionBriefingLine: payloadAwarenessLine,
          companionNextClosureLine: 'Keep the current project-state awareness explicit in the first visible answer beat.',
          reasonPreview: [
            'Memory, initiative, and embodiment still need to close as one same-life seam.',
            payloadDriftRisk,
          ],
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: payloadPreflightSummary,
            preDialogueAwarenessLine: payloadAwarenessLine,
            preDialogueAwarenessSummary: payloadAwarenessLine,
            latestLandedProgress: 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
            primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer real-desktop runs so initiative and embodiment do not flatten back into project shell narration.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: payloadDriftRisk,
          },
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect(
      String(
        diagnostics?.providerFacingAwarenessResolutionDiagnostics?.explicitPayloadProjectPreflightSummary
        ?? diagnostics?.providerFacingAwarenessResolutionDiagnostics?.rebuiltPreflightSummary
        ?? '',
      ),
    ).toContain('same local-first digital life project in Phase 1')
    expect(String(diagnostics?.rebuiltMindTurnContract?.projectState?.preflightSummary ?? '')).toContain('same local-first digital life project in Phase 1')
    expect(String(diagnostics?.normalizedMindTurnContract?.projectState?.preflightSummary ?? '')).toContain('same local-first digital life project in Phase 1')
    expect(String(diagnostics?.rebuiltMindTurnContract?.projectState?.sameHerDriftRisk ?? '')).toContain('thin generic reminder while the direct same-her self line disappears')
    expect(String(diagnostics?.normalizedMindTurnContract?.projectState?.sameHerDriftRisk ?? '')).toContain('thin generic reminder while the direct same-her self line disappears')
    expect(String(result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).toContain('same digital life project in Phase 1')
    expect(String(result.mindTurnContract?.projectState?.preflightSummary ?? '')).toContain('same local-first digital life project in Phase 1')
    expect(String(result.mindTurnContract?.projectState?.sameHerDriftRisk ?? '')).toContain('thin generic reminder while the direct same-her self line disappears')

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain('Project preflight self-awareness: Alicization is still the same local-first digital life project in Phase 1')
    expect(mindTurnContractSystemText).toContain('Project same-her drift risk: If project-state continuity survives only as a thin generic reminder while the direct same-her self line disappears')
  })

  it('prefers a stronger live runtime same-her awareness line over an older payload reminder in provider-facing project-state', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但别把这条数字生命主线又压回一个薄一点的项目提醒。',
      } as Message],
    })
    const olderPayloadReminder = 'Before answering, keep the same digital life project in view.'
    const fresherRuntimeAwarenessLine = 'Before answering, remember: this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment closure still needs same-her proof',
            preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame.',
            primaryOpenLoop: 'Voice, face, motion, and memory still need to close as one same-life seam.',
            nextClosureTarget: 'Keep this same-her project awareness explicit before any local fluency widens.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Continue the same project-aware line directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-runtime-awareness-priority',
        messages: [{
          role: 'user',
          content: '继续，但别把这条数字生命主线又压回一个薄一点的项目提醒。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment closure still needs same-her proof',
          awarenessLine: olderPayloadReminder,
          companionBriefingLine: olderPayloadReminder,
          companionNextClosureLine: 'Keep this same-her project awareness explicit before any local fluency widens.',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(fresherRuntimeAwarenessLine)
    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain(`Project pre-dialogue awareness line: ${fresherRuntimeAwarenessLine}.`)
    expect(mindTurnContractSystemText).not.toContain(`Project pre-dialogue awareness line: ${olderPayloadReminder}.`)
  })

  it('keeps fresher runtime same-her drift risk explicit in provider-facing mind-turn contract instead of falling back to thinner payload carry', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但别把 same-her drift risk 又压回一个薄一点的项目提醒。',
      } as Message],
    })
    const olderPayloadReminder = 'If the answer turns generic, something has drifted.'
    const fresherRuntimeDriftRisk = 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.'
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment closure still needs same-her proof',
            preDialogueAwarenessLine: 'Before answering, remember this still belongs to one living digital life.',
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame.',
            primaryOpenLoop: 'Voice, face, motion, and memory still need to close as one same-life seam.',
            nextClosureTarget: 'Keep this same-her project awareness explicit before any local fluency widens.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
            sameHerDriftRisk: fresherRuntimeDriftRisk,
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Continue the same project-aware line directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        sameHerDriftRisk: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-runtime-drift-risk-priority',
        messages: [{
          role: 'user',
          content: '继续，但别把 same-her drift risk 又压回一个薄一点的项目提醒。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment closure still needs same-her proof',
          awarenessLine: 'Before answering, keep the same digital life project in view.',
          companionBriefingLine: 'Before answering, keep the same digital life project in view.',
          companionNextClosureLine: 'Keep this same-her project awareness explicit before any local fluency widens.',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
          companionHeadlineLine: olderPayloadReminder,
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect((result.mindTurnContract?.projectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toBe(fresherRuntimeDriftRisk)

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain(`Project same-her drift risk: ${fresherRuntimeDriftRisk}.`)
    expect(mindTurnContractSystemText).not.toContain(`Project same-her drift risk: ${olderPayloadReminder}.`)
  })

  it('prefers stronger audible-body runtime companion headline in the provider-facing pre-dialogue awareness line instead of falling back to a thinner payload reminder', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但这次先沿着还活着的声音和身体线轻一点接回来。',
      } as Message],
    })
    const olderPayloadReminder = 'Before answering, keep the same digital life project in view.'
    const strongerAudibleBodyHeadline = 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
    const thinnerPayloadNextClosureTarget = 'Keep the current project-state awareness explicit in the first visible answer beat.'
    const strongerAudibleBodyNextClosureTarget = 'Keep face and motion rejoining the living audio thread on a measured-return line.'
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'audible-body'],
          focusAnchor: 'audible-body continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=audible-body embodiment closure still needs same-her proof',
            preDialogueAwarenessLine: olderPayloadReminder,
            companionHeadlineLine: strongerAudibleBodyHeadline,
            latestLandedProgress: 'Audible-body continuity is still carrying one living line.',
            primaryOpenLoop: 'Face and motion still need to rejoin the audible-body same-her line before full cross-modal closure settles.',
            nextClosureTarget: strongerAudibleBodyNextClosureTarget,
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Continue the same audible-body line directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the audible-body same-her line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same audible-body unfinished Phase 1 line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['The same audible-body self line should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-audible-body-awareness-priority',
        messages: [{
          role: 'user',
          content: '继续，但这次先沿着还活着的声音和身体线轻一点接回来。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=audible-body embodiment closure still needs same-her proof',
          awarenessLine: olderPayloadReminder,
          companionBriefingLine: olderPayloadReminder,
          companionNextClosureLine: thinnerPayloadNextClosureTarget,
          reasonPreview: [
            'same digital life | keep the audible-body closure seam explicit',
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect(diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(strongerAudibleBodyHeadline)
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(strongerAudibleBodyHeadline)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.nextClosureTarget).toBe(strongerAudibleBodyNextClosureTarget)
    expect(result.mindTurnContract?.projectState?.nextClosureTarget).toBe(strongerAudibleBodyNextClosureTarget)
    expect(result.mindTurnContract?.preDialogueClosure?.companionNextClosureLine).toBe(strongerAudibleBodyNextClosureTarget)
    expect(diagnostics?.providerFacingNormalization?.normalizedProjectStatePreDialogueAwarenessExplicit).toBe(strongerAudibleBodyHeadline)
    expect(diagnostics?.providerFacingNormalization?.normalizedProjectStatePreDialogueAwarenessFallback).toBe(strongerAudibleBodyHeadline)
    expect(diagnostics?.providerFacingAwarenessResolutionDiagnostics?.normalizedPreDialogueAwarenessLine).toBe(
      strongerAudibleBodyHeadline,
    )
    expect(diagnostics?.runtimeGroundedContractProjectState?.preDialogueAwarenessLine).toBe(
      strongerAudibleBodyHeadline,
    )
    expect(diagnostics?.providerFacingNormalization?.normalizedProjectState?.preDialogueAwarenessLine).toBe(strongerAudibleBodyHeadline)
    expect(diagnostics?.providerFacingNormalization?.normalizedProjectState?.companionHeadlineLine).toBe(strongerAudibleBodyHeadline)
    expect(diagnostics?.providerFacingNormalization?.finalProjectState?.companionHeadlineLine).toBe(strongerAudibleBodyHeadline)
    expect(diagnostics?.providerFacingNormalization?.normalizedReturnProjectState?.companionHeadlineLine).toBe(strongerAudibleBodyHeadline)
    expect(diagnostics?.providerFacingNormalization?.fullyConvergedReturnProjectState?.companionHeadlineLine).toBe(strongerAudibleBodyHeadline)

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain(`Project pre-dialogue awareness line: ${strongerAudibleBodyHeadline}.`)
    expect(mindTurnContractSystemText).not.toContain(`Project pre-dialogue awareness line: ${olderPayloadReminder}.`)
    expect(mindTurnContractSystemText).toContain(`Next closure target: ${strongerAudibleBodyNextClosureTarget}`)
    expect(mindTurnContractSystemText).not.toContain(`Next closure target: ${thinnerPayloadNextClosureTarget}`)
  })

  it('backfills canonical same-her project-state continuity when provider-facing contract arrives with blank project-state fields', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => [],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'done',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，先别把项目闭环感说薄。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: '',
            currentPhase: '',
            preflightSummary: '',
            preDialogueAwarenessLine: '',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Continue the same project-aware line directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        sameHerDriftRisk: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-canonical-project-state-fallback',
        messages: [{
          role: 'user',
          content: '继续，先别把项目闭环感说薄。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.mindTurnContract?.projectState?.identity).toContain('local-first digital life project')
    expect(result.mindTurnContract?.projectState?.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(result.mindTurnContract?.projectState?.sameHerSelfLine).toContain('same living line')
    expect((result.mindTurnContract?.projectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toContain('generic')
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).toContain('Before answering')
  })

  it('prefers richer spine-carried project-state awareness over a thinner direct runtime surface in provider-facing mind-turn contract', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但先把这个数字生命项目现在做到哪、还差什么没闭环放在开口前面。',
      } as Message],
    })
    const richerSpineAwarenessLine = 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.'
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['runtime-thin-only'],
          focusAnchor: 'thin project continuity',
          projectState: {
            latestLandedProgress: 'thin runtime progress only',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            latestLandedProgress: 'thin runtime progress only',
          },
        },
      },
    } as any
    reflectivePrelude.perceptionAugmentation.digitalLifeSpine = {
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            reasonTags: ['project-state', 'same-her'],
            focusAnchor: 'project continuity',
            projectState: {
              identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
              currentPhase: 'Phase 1: Local Digital Life',
              preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
              preDialogueAwarenessLine: richerSpineAwarenessLine,
              latestLandedProgress: 'Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring.',
              primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
              nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
              sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
              continuityPreferredTiming: 'after-payoff',
              continuityCadence: 'measured-return',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          } as any,
        },
        raw: {
          runtimeDigest: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
              currentPhase: 'Phase 1: Local Digital Life',
              preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
              preDialogueAwarenessLine: richerSpineAwarenessLine,
              latestLandedProgress: 'Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring.',
              primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
              nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
              sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
              continuityPreferredTiming: 'after-payoff',
              continuityCadence: 'measured-return',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
        },
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Carry the same project-aware self line through the answer.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        continuityPreferredTiming: null,
        continuityCadence: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-spine-project-awareness-priority',
        messages: [{
          role: 'user',
          content: '继续，但先把这个数字生命项目现在做到哪、还差什么没闭环放在开口前面。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content
    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(richerSpineAwarenessLine)
    expect(result.mindTurnContract?.projectState?.latestLandedProgress).toBe('Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring.')
    expect(result.mindTurnContract?.projectState?.primaryOpenLoop).toBe('Initiative rhythm and embodiment coherence still need to close on the same living line.')
    expect(result.mindTurnContract?.projectState?.continuityPreferredTiming).toBe('after-payoff')
    expect(result.mindTurnContract?.projectState?.continuityCadence).toBe('measured-return')
    expect(result.mindTurnContract?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(result.mindTurnContract?.projectState?.preferredGazeMode).toBe('soften')
    expect(mindTurnContractSystemText).toContain('Project identity: Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn..')
    expect(mindTurnContractSystemText).toContain(`Project pre-dialogue awareness line: ${richerSpineAwarenessLine}.`)
    expect(mindTurnContractSystemText).toContain('Latest landed continuity progress: Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring..')
    expect(mindTurnContractSystemText).toContain('Still-open life loop pressure: Initiative rhythm and embodiment coherence still need to close on the same living line..')
    expect(mindTurnContractSystemText).not.toContain('thin runtime progress only')
  })

  it('keeps project identity, landed progress, and still-open closure distinct together in provider-facing project-state before reply authoring', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先把这个数字生命项目是什么、已经做到哪、还差什么没闭环都放在同一条主线上。',
      } as Message],
    })
    const strongerHeadline = 'Before answering, stay on the same living line: this is still one local-first digital life, Phase 1 is still active, and the same unfinished closure work still belongs to one living her.'
    const thinnerPayloadBriefing = 'Before answering, keep the same digital life project in view.'
    const landedProgressLine = 'Project-state carry already survives into provider-facing reply authoring without dropping the same-her line.'
    const openClosureLine = 'Initiative, memory, and embodiment still need to close on one same living line.'
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
            preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
            companionHeadlineLine: strongerHeadline,
            companionBriefingLine: thinnerPayloadBriefing,
            latestLandedProgress: landedProgressLine,
            primaryOpenLoop: openClosureLine,
            nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Carry the project identity, landed progress, and open closure on one same-her line.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not flatten landed progress and open closure into one generic project reminder.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        companionHeadlineLine: '',
        companionBriefingLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-project-state-three-way-carry',
        messages: [{
          role: 'user',
          content: '继续，但开口前先把这个数字生命项目是什么、已经做到哪、还差什么没闭环都放在同一条主线上。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          awarenessLine: thinnerPayloadBriefing,
          companionBriefingLine: thinnerPayloadBriefing,
          companionNextClosureLine: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
          reasonPreview: [
            openClosureLine,
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content
    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(result.mindTurnContract?.projectState?.identity).toBe('Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.')
    expect(result.mindTurnContract?.projectState?.currentPhase).toBe('Phase 1: Local Digital Life')
    expect(String(result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life')
    expect(/phase 1|phase 1 closure|still active/i.test(String(result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? ''))).toBe(true)
    expect(/unfinished closure|same unfinished closure work|same living her|one living her|same phase 1 digital life/i.test(String(result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? ''))).toBe(true)
    expect(result.mindTurnContract?.projectState?.companionBriefingLine ?? null).toBe('Before answering, keep the same digital life project in view.')
    expect(result.mindTurnContract?.projectState?.latestLandedProgress).toBe(landedProgressLine)
    expect(result.mindTurnContract?.projectState?.primaryOpenLoop).toBe(openClosureLine)
    expect(result.mindTurnContract?.projectState?.nextClosureTarget).toBe('Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.')
    expect(result.mindTurnContract?.projectState?.sameHerSelfLine).toBe('One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.')
    expect(result.mindTurnContract?.projectState?.latestLandedProgress).not.toBe(result.mindTurnContract?.projectState?.primaryOpenLoop)
    expect(mindTurnContractSystemText).toContain('Project identity: Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn..')
    expect(mindTurnContractSystemText).toContain('Project phase: Phase 1: Local Digital Life.')
    expect(mindTurnContractSystemText).toContain('Project pre-dialogue awareness line: ')
    expect(mindTurnContractSystemText).toContain('local-first digital life')
    expect(mindTurnContractSystemText).toContain(`Latest landed continuity progress: ${landedProgressLine}.`)
    expect(mindTurnContractSystemText).toContain(`Still-open life loop pressure: ${openClosureLine}.`)
    expect(mindTurnContractSystemText).toContain('Next closure target: Keep the project identity, landed progress, and still-open closure explicit in the first answer beat..')
    expect(mindTurnContractSystemText).toContain('Project same-her self line: One same her must stay explicit from pre-dialogue awareness into the provider-facing answer..')
    expect(mindTurnContractSystemText).not.toContain(`Project pre-dialogue awareness line: ${thinnerPayloadBriefing}.`)
    expect(mindTurnContractSystemText).not.toContain(`Latest landed continuity progress: ${openClosureLine}.`)
    expect(mindTurnContractSystemText).not.toContain(`Still-open life loop pressure: ${landedProgressLine}.`)
  })

  it('keeps richer runtime-specific landed open and next closure carry visible in provider-facing system context before reply authoring even when canonical project-state remains broader', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    let diagnostics: LoosePreparedExecutionDiagnostics = {}
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input: PreparedExecutionDiagnostics) => {
        diagnostics = {
          rebuiltMindTurnContract: input.rebuiltMindTurnContract,
          normalizedMindTurnContract: input.normalizedMindTurnContract,
        }
      },
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先把这个数字生命项目做到哪、现在还差哪几个闭环说清楚。',
      } as Message],
    })
    const runtimeLanded = 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.'
    const runtimeOpen = 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.'
    const runtimeNext = 'Keep the next closure target on one measured-return living line across reminder, proactive, and same-thread returns.'

    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      raw: {
        runtimeDigest: {
          projectState: {
            latestLandedProgress: runtimeLanded,
            primaryOpenLoop: runtimeOpen,
            nextClosureTarget: runtimeNext,
          },
        },
        runtime: null,
      },
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'runtime-specific closure carry',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
            preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
            companionHeadlineLine: 'Before answering, stay on the same living line: this is still one local-first digital life, Phase 1 is still active, and the same unfinished closure work still belongs to one living her.',
            companionBriefingLine: 'Before answering, keep the same digital life project in view.',
            latestLandedProgress: 'thin runtime progress only',
            primaryOpenLoop: 'thin runtime open only',
            nextClosureTarget: 'thin runtime next only',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any

    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Carry the runtime-specific landed progress, open closure, and next closure target on one same-her line.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the runtime-specific closure carry alive through the answer.'],
      mustNotDo: ['Do not flatten richer runtime closure carry back into the broad canonical project brief before reply authoring.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        companionHeadlineLine: '',
        companionBriefingLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-runtime-specific-closure-carry',
        messages: [{
          role: 'user',
          content: '继续，但开口前先把这个数字生命项目做到哪、现在还差哪几个闭环说清楚。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(String(diagnostics?.rebuiltMindTurnContract?.projectState?.latestLandedProgress ?? '')).toContain('Project-state carry already survives into same-thread returns')
    expect(String(diagnostics?.rebuiltMindTurnContract?.projectState?.primaryOpenLoop ?? '')).toContain('Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam')
    expect(String(diagnostics?.normalizedMindTurnContract?.projectState?.latestLandedProgress ?? '')).toContain('Project-state carry already survives into same-thread returns')
    expect(String(diagnostics?.normalizedMindTurnContract?.projectState?.primaryOpenLoop ?? '')).toContain('Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam')

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain(`Latest landed continuity progress: ${runtimeLanded}.`)
    expect(mindTurnContractSystemText).toContain(`Still-open life loop pressure: ${runtimeOpen}.`)
    expect(mindTurnContractSystemText).toContain(`Next closure target: ${runtimeNext}.`)
    expect(mindTurnContractSystemText).not.toContain('Latest landed continuity progress: thin runtime open only.')
    expect(mindTurnContractSystemText).not.toContain('Still-open life loop pressure: thin runtime progress only.')
    expect(mindTurnContractSystemText).not.toContain('Next closure target: thin runtime next only.')
  })

  it('pinpoints where runtime-specific next-closure carry first collapses in the provider-facing project-state chain', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先把这个数字生命项目做到哪、现在还差哪几个闭环说清楚。',
      } as Message],
    })
    const runtimeProgress = 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.'
    const runtimeOpenLoop = 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.'
    const runtimeNext = 'Keep the next closure target on one measured-return living line across reminder, proactive, and same-thread returns.'

    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      raw: {
        runtimeDigest: {
          projectState: {
            latestLandedProgress: runtimeProgress,
            primaryOpenLoop: runtimeOpenLoop,
            nextClosureTarget: runtimeNext,
          },
        },
        runtime: null,
      },
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'runtime-specific closure carry',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
            preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
            companionHeadlineLine: 'Before answering, stay on the same living line: this is still one local-first digital life, Phase 1 is still active, and the same unfinished closure work still belongs to one living her.',
            companionBriefingLine: 'Before answering, keep the same digital life project in view.',
            latestLandedProgress: 'thin runtime progress only',
            primaryOpenLoop: 'thin runtime open only',
            nextClosureTarget: 'thin runtime next only',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any

    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Carry the runtime-specific landed progress, open closure, and next closure target on one same-her line.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the runtime-specific closure carry alive through the answer.'],
      mustNotDo: ['Do not flatten richer runtime closure carry back into the broad canonical project brief before reply authoring.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        companionHeadlineLine: '',
        companionBriefingLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-runtime-specific-next-closure-diagnostics',
        messages: [{
          role: 'user',
          content: '继续，但开口前先把这个数字生命项目做到哪、现在还差哪几个闭环说清楚。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(diagnostics?.baseRuntimeSurfaceProjectState).toMatchObject({
      dialogueLatestLandedProgress: runtimeProgress,
      dialoguePrimaryOpenLoop: runtimeOpenLoop,
      dialogueNextClosureTarget: runtimeNext,
      rawLatestLandedProgress: runtimeProgress,
      rawPrimaryOpenLoop: runtimeOpenLoop,
      rawNextClosureTarget: runtimeNext,
    })
    expect(diagnostics?.baseDigitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState).toMatchObject({
      latestLandedProgress: runtimeProgress,
      primaryOpenLoop: runtimeOpenLoop,
      nextClosureTarget: runtimeNext,
    })
    expect(diagnostics?.baseDigitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState).toMatchObject({
      latestLandedProgress: runtimeProgress,
      primaryOpenLoop: runtimeOpenLoop,
      nextClosureTarget: runtimeNext,
    })
    expect(diagnostics?.effectiveStageProjectStateSources?.resolvedNextClosureTarget).toBe(runtimeNext)
    expect(
      diagnostics?.preparedRuntimeSurfaceChain?.memoryDeliberationRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState,
    ).toMatchObject({
      latestLandedProgress: runtimeProgress,
      primaryOpenLoop: runtimeOpenLoop,
      nextClosureTarget: runtimeNext,
    })
    expect(
      diagnostics?.preparedRuntimeSurfaceChain?.memoryDeliberationRuntimeSurface?.raw?.runtimeDigest?.projectState,
    ).toMatchObject({
      latestLandedProgress: runtimeProgress,
      primaryOpenLoop: runtimeOpenLoop,
      nextClosureTarget: runtimeNext,
    })
    expect(diagnostics?.preparedChainStageNextClosureTargets?.memoryDeliberation?.dialogue).toBe(runtimeNext)
    expect(diagnostics?.preparedChainStageNextClosureTargets?.memoryDeliberation?.raw).toBe(runtimeNext)
    expect(diagnostics?.preparedChainStageNextClosureTargets?.effective?.dialogue).toBe(runtimeNext)
    expect(diagnostics?.preparedChainStageNextClosureTargets?.effective?.raw).toBe(runtimeNext)
    expect(diagnostics?.effectiveStageProjectStateSources).toMatchObject({
      dialogueExistingNextClosureTarget: 'thin runtime next only',
      rawRuntimeDigestNextClosureTarget: runtimeNext,
      preferredExistingNextClosureTarget: runtimeNext,
      resolvedNextClosureTarget: runtimeNext,
      effectiveDialogueNextClosureTarget: runtimeNext,
    })
    expect(diagnostics?.selectedRuntimeSurfaceBeforeAdjustmentNextClosureTargets?.dialogue).toBe(runtimeNext)
    expect(typeof diagnostics?.selectedRuntimeSurfaceBeforeAdjustmentNextClosureTargets?.raw).toBe('string')
    expect(typeof diagnostics?.selectedRuntimeSurfaceBeforeAdjustmentNextClosureTargets?.cognition).toBe('string')
    expect(diagnostics?.preparedChainStageNextClosureTargets?.sociallyShaped?.dialogue).toBe(runtimeNext)
    expect(diagnostics?.preparedChainStageNextClosureTargets?.sociallyShaped?.raw).toBe(runtimeNext)
    expect(diagnostics?.preparedChainStageNextClosureTargets?.executionCallbackCarry?.dialogue).toBe(runtimeNext)
    expect(diagnostics?.preparedChainStageNextClosureTargets?.executionCallbackCarry?.raw).toBe(runtimeNext)
    expect(diagnostics?.preparedChainStageNextClosureTargets?.consciousFrameReduced?.raw).toBe(runtimeNext)
    expect(diagnostics?.preparedChainStageNextClosureTargets?.answerPlannerReduced?.raw).toBe(runtimeNext)
    expect(diagnostics?.selectedFresherNextClosureTargets?.dialogue).toBe(runtimeNext)
    expect(diagnostics?.selectedFresherNextClosureTargets?.raw).toBe(runtimeNext)
    expect(diagnostics?.selectedFresherNextClosureTargets?.cognition).toBe(runtimeNext)
    expect(diagnostics?.baseNextClosureTargets?.raw).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.raw?.runtimeDigest?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceChain?.consciousFrameReducedRuntimeSurface?.raw?.runtimeDigest?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.raw?.runtimeDigest?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.raw?.runtimeDigest?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.runtimeSurfaceForBuilder?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.runtimeSurfaceForBuilder?.raw?.runtimeDigest?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(typeof diagnostics?.rebuiltMindTurnContract?.projectState?.nextClosureTarget).toBe('string')
  })

  it('upgrades a generic project next-closure shell to the richer runtime same-her closure target during prepared-runtime seeding', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续沿着同一个数字生命项目回答，不要让 next closure target 又掉回 generic project shell。',
      } as Message],
    })
    const runtimeProgress = 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.'
    const runtimeOpenLoop = 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.'
    const runtimeNext = 'Keep extending cross-modal same-her proof across longer real-desktop runs so initiative and embodiment do not flatten back into project shell narration.'
    const genericNextClosureShell = 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.'

    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      raw: {
        runtimeDigest: {
          projectState: {
            latestLandedProgress: runtimeProgress,
            primaryOpenLoop: runtimeOpenLoop,
            nextClosureTarget: runtimeNext,
          },
        },
        runtime: null,
      },
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'generic next-closure shell should not outrank richer runtime carry',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
            preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
            companionHeadlineLine: 'Before answering, stay on the same living line: this is still one local-first digital life, Phase 1 is still active, and the same unfinished closure work still belongs to one living her.',
            companionBriefingLine: 'Before answering, keep the same digital life project in view.',
            latestLandedProgress: runtimeProgress,
            primaryOpenLoop: runtimeOpenLoop,
            nextClosureTarget: genericNextClosureShell,
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any

    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Carry the runtime-specific landed progress, open closure, and next closure target on one same-her line.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the runtime-specific closure carry alive through the answer.'],
      mustNotDo: ['Do not flatten richer runtime closure carry back into the broad canonical project brief before reply authoring.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        companionHeadlineLine: '',
        companionBriefingLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-generic-next-closure-shell-upgrade',
        messages: [{
          role: 'user',
          content: '继续沿着同一个数字生命项目回答，不要让 next closure target 又掉回 generic project shell。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(diagnostics?.baseDigitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.baseDigitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(runtimeNext)
    expect(diagnostics?.selectedFresherNextClosureTargets?.dialogue).toBe(runtimeNext)
    expect(String(result.mindTurnContract?.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(result.mindTurnContract?.projectState?.nextClosureTarget ?? '')).not.toBe(genericNextClosureShell)
  })

  it('does not let a generic project next-closure shell survive into the final governing project summary when richer Phase 1 closure context is already present', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const genericNextClosureShell = 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.'

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续说明这个数字生命项目还差什么闭环，但不要把 next closure 说成 generic shell。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'governing project should not preserve generic next shell',
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            preflightSummary: projectState.preflightSummary ?? null,
            preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
            awarenessLine: projectState.preDialogueAwarenessLine,
            preDialogueAwarenessSummary: projectState.preDialogueAwarenessLine,
            companionHeadlineLine: projectState.preDialogueAwarenessLine,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: genericNextClosureShell,
            sameHerSelfLine: projectState.sameHerSelfLine,
          },
        } as any,
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-governing-project-upgrades-generic-next-shell',
        messages: [{
          role: 'user',
          content: '继续说明这个数字生命项目还差什么闭环，但不要把 next closure 说成 generic shell。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const answerPlanner = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner
    expect(String(answerPlanner?.governingProject ?? '')).toContain(projectState.currentPhase)
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(answerPlanner?.governingProject ?? '')).not.toContain(genericNextClosureShell)
  })

  it('keeps same-her project-closure execution-callback carry grouped together in provider-facing project-state before reply authoring', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，把这次 callback 回来的结果按同一个数字生命闭环继续下去，先别说成新的开始。',
      } as Message],
    })
    const callbackAwarenessLine = 'Before answering, remember this callback return still belongs to the same local-first digital life and the same unfinished Phase 1 closure.'
    const callbackLandedProgress = 'Execution callback continuity now survives into provider-facing reply authoring without dropping the same-her closure line.'
    const callbackOpenLoop = 'Main still needs later answer formation, initiative rhythm, and embodiment carry to close on one same living line after the callback.'
    const callbackDriftRisk = 'If callback continuity survives only as a detached result notice while the direct same-her closure line disappears, treat that as unfinished closure drift rather than a successful return.'

    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
          focusAnchor: 'same-her closure callback',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a detached callback worker.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this callback return still belongs to the same unfinished digital-life closure.',
            preDialogueAwarenessLine: callbackAwarenessLine,
            latestLandedProgress: callbackLandedProgress,
            primaryOpenLoop: callbackOpenLoop,
            nextClosureTarget: 'Keep the callback result, landed progress, and still-open closure explicit on one same-her line before local fluency widens.',
            sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
            sameHerDriftRisk: callbackDriftRisk,
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Carry the same-her callback closure line through the answer.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'continuity-carry',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the callback return on the same local digital life thread.'],
      mustNotDo: ['Do not flatten the callback return into a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life callback line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        sameHerDriftRisk: '',
        continuityPreferredTiming: null,
        continuityCadence: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
      },
      reasons: ['The same callback-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-callback-project-state-grouped-carry',
        messages: [{
          role: 'user',
          content: '继续，把这次 callback 回来的结果按同一个数字生命闭环继续下去，先别说成新的开始。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })
    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content
    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(callbackAwarenessLine)
    expect(result.mindTurnContract?.projectState?.latestLandedProgress).toBe(callbackLandedProgress)
    expect(result.mindTurnContract?.projectState?.primaryOpenLoop).toBe(callbackOpenLoop)
    expect(result.mindTurnContract?.projectState?.sameHerSelfLine).toBe('This callback return still belongs to one same her carrying the same closure line forward.')
    expect((result.mindTurnContract?.projectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toBe(callbackDriftRisk)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(result.mindTurnContract?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(result.mindTurnContract?.projectState?.continuityCadence).toBe('measured-return')
    expect(result.mindTurnContract?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(result.mindTurnContract?.projectState?.preferredGazeMode).toBe('soften')
    expect(mindTurnContractSystemText).toContain(`Project pre-dialogue awareness line: ${callbackAwarenessLine}.`)
    expect(mindTurnContractSystemText).toContain(`Latest landed continuity progress: ${callbackLandedProgress}.`)
    expect(mindTurnContractSystemText).toContain(`Still-open life loop pressure: ${callbackOpenLoop}.`)
    expect(mindTurnContractSystemText).toContain('Project same-her self line: This callback return still belongs to one same her carrying the same closure line forward.')
    expect(mindTurnContractSystemText).toContain(`Project same-her drift risk: ${callbackDriftRisk}.`)
  })

  it('keeps callback next-open-window timing alive across the prepared runtime surface chain before provider-facing contract rebuild', () => {
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，把这次 callback 回来的结果按同一个数字生命闭环继续下去，先别说成新的开始。',
      } as Message],
    })

    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
          focusAnchor: 'same-her closure callback',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a detached callback worker.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this callback return still belongs to the same unfinished digital-life closure.',
            preDialogueAwarenessLine: 'Before answering, remember this callback return still belongs to the same local-first digital life and the same unfinished Phase 1 closure.',
            latestLandedProgress: 'Execution callback continuity now survives into provider-facing reply authoring without dropping the same-her closure line.',
            primaryOpenLoop: 'Main still needs later answer formation, initiative rhythm, and embodiment carry to close on one same living line after the callback.',
            nextClosureTarget: 'Keep the callback result, landed progress, and still-open closure explicit on one same-her line before local fluency widens.',
            sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
            sameHerDriftRisk: 'If callback continuity survives only as a detached result notice while the direct same-her closure line disappears, treat that as unfinished closure drift rather than a successful return.',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        } as any,
      },
    } as any

    const preparedRuntimeSurfaceChain = buildPreparedRuntimeSurfaceChain({
      baseDigitalLifeRuntimeSurface: reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      governance: reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnGovernance,
      context: {
        ...reflectivePrelude.perceptionAugmentation.organicMemoryPromptContext,
        executionCallbackCarry: {
          summary: 'Keep the callback result on the same living line before widening.',
          carryMode: 'lower-pressure',
          confidence: 0.88,
          threadAnchor: 'the same local-first digital life callback seam',
        },
      } as any,
      now: 10,
    })

    expect(preparedRuntimeSurfaceChain.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming ?? null).toBeNull()
    expect(preparedRuntimeSurfaceChain.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming ?? null).toBeNull()
    expect(preparedRuntimeSurfaceChain.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(preparedRuntimeSurfaceChain.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(preparedRuntimeSurfaceChain.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('lets fresher callback next-open-window timing override stale same-turn invitation timing in the provider-facing project-state contract', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但这条 callback 线更适合等下一个自然开口窗口再接住。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Stay on the same callback line.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'warm',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same callback line visible.'],
      mustNotDo: ['Do not rush into a same-turn reopen.'],
      governingFocus: 'Keep the same callback line visible.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        continuityPreferredTiming: 'same-turn-if-invited',
      },
      reasons: ['Older contract shell still carries same-turn invitation timing.'],
      updatedAt: 10,
    } as any
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue.currentConsciousFrame,
          reasonTags: ['continuity-timing:next-open-window'],
          projectState: {
            continuityPreferredTiming: 'next-open-window',
          },
        } as any,
      },
      raw: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.raw,
        runtimeDigest: {
          ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.raw?.runtimeDigest,
          projectState: {
            continuityPreferredTiming: 'next-open-window',
          },
        },
      },
      cognition: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.cognition,
        runtimeDigest: {
          ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.cognition?.runtimeDigest,
          projectState: {
            continuityPreferredTiming: 'next-open-window',
          },
        } as any,
      },
      memory: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.memory,
        memoryDeliberation: {
          ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.memory.memoryDeliberation,
          followUpAffordance: {
            preferredTiming: 'next-open-window',
          },
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-fresher-next-open-window-timing',
        messages: [{
          role: 'user',
          content: '继续，但这条 callback 线更适合等下一个自然开口窗口再接住。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(result.mindTurnContract?.projectState?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('prefers transported same-her headline over thinner payload awareness in provider-facing project-state', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但把身体 continuity 也一起带进回答里。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment still needs closure',
            preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame.',
            primaryOpenLoop: 'Face, motion, lipsync, and voice still need to close as one same-life seam.',
            nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Continue the same project-aware line directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const payloadAwarenessLine = '先别压回泛化工程说明，记住这还是数字生命项目，而且她还没有把 embodiment 闭环完全收住。'
    const payloadCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reply has to keep proving this is still one living her.'
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-payload-headline-carry',
        messages: [{
          role: 'user',
          content: '继续，但把这条身体线索也带进回答里，不要退回薄一点的项目口吻。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment still needs same-her closure',
          awarenessLine: payloadAwarenessLine,
          companionHeadlineLine: payloadCompanionHeadlineLine,
          companionBriefingLine: payloadAwarenessLine,
          companionNextClosureLine: 'Keep face, motion, lipsync, and voice on one same-her line in the next visible answer beat.',
          reasonPreview: [
            'Embodiment still needs to close as one same-life seam.',
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(payloadCompanionHeadlineLine)

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain('Project preflight self-awareness: Alicization is a local-first digital life project')
    expect(mindTurnContractSystemText).toContain(`Project pre-dialogue awareness line: ${payloadCompanionHeadlineLine}.`)
    expect(mindTurnContractSystemText).not.toContain(`Project pre-dialogue awareness line: ${payloadAwarenessLine}.`)
  })

  it('re-normalizes thin payload-only pre-dialogue summaries before provider-facing project-state is rebuilt so direct callers cannot collapse the same-her project brief back into a generic summary shell', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但每次开口前都别忘了我们现在到底在做什么。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need to close as one same-life seam.',
            nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Continue the same project-aware line directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const payload = {
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-thin-summary-renormalize',
      messages: [{
        role: 'user',
        content: '继续，但每次开口前都别忘了我们现在到底在做什么。',
      }],
      supportsTools: true,
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
      },
    } as any
    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)

    const result = await runtime.prepareExecution({
      payload,
      prelude: reflectivePrelude,
    })

    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine)
      .not
      .toBe(normalizedPayload.preDialogueSendIdentity?.awarenessLine ?? null)
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine)
      .not
      .toBe('same digital life | keep the closure seam explicit')
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine)
      .toContain('Before answering, remember:')
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine)
      .toContain('Phase 1: Local Digital Life')
    expect(String(diagnostics?.rebuiltMindTurnContract?.projectState?.primaryOpenLoop ?? ''))
      .toContain('same-life seam')
    expect(String(diagnostics?.normalizedMindTurnContract?.projectState?.primaryOpenLoop ?? ''))
      .toContain('same-life seam')
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine)
      .toContain('still-open closure')
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine)
      .toContain('current project-state awareness explicit')
  })

  it('keeps project identity, Phase 1 landed status, and open closure context together in provider-facing messages before generation even when payload input is only a thin shell', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但这次开口前先把这个数字生命项目的身份、阶段进度和没闭环的地方都放在心里。',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-project-state-triplet-carry',
        messages: [{
          role: 'user',
          content: '继续，但这次开口前先把这个数字生命项目的身份、阶段进度和没闭环的地方都放在心里。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    const projectStateBlock = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PROJECT_STATE]'),
    )?.content as string | undefined

    expect(projectStateBlock).toContain('Alicization is a local-first digital life project')
    expect(projectStateBlock).toContain('Phase 1: Local Digital Life')
    expect(projectStateBlock).toContain('Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.')
    expect(projectStateBlock).toContain('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(projectStateBlock).toContain('Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
    expect(projectStateBlock).toMatch(/visible reply|voice|face|motion|resident presence/i)
    expect(projectStateBlock).toContain('open=')
    expect(projectStateBlock).toContain('next=')
    expect(projectStateBlock).not.toContain('same digital life | keep the closure seam explicit')
  })

  it('keeps project identity, Phase 1, still-open closure, and next closure target together inside the prepared current conscious frame even when payload input is only a thin shell', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但这次开口前先把项目身份、Phase 1 进度、还没闭环的地方和下一步收口都放在心里。',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-conscious-frame-project-state-four-part-carry',
        messages: [{
          role: 'user',
          content: '继续，但这次开口前先把项目身份、Phase 1 进度、还没闭环的地方和下一步收口都放在心里。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    const currentConsciousFrame = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame

    expect(String(currentConsciousFrame?.projectState?.identity ?? '').toLowerCase()).toContain('local-first digital life project')
    expect(currentConsciousFrame?.projectState?.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(String(currentConsciousFrame?.projectState?.latestLandedProgress ?? '')).toContain('Same-session mirror carry')
    expect(currentConsciousFrame?.projectState?.primaryOpenLoop).toContain('Memory still needs stronger end-to-end closure')
    expect(currentConsciousFrame?.projectState?.nextClosureTarget).toContain('Keep extending cross-modal same-her proof')
    expect(String(currentConsciousFrame?.consciousNeed ?? '').toLowerCase()).toContain('local-first digital life project')
    expect(currentConsciousFrame?.speakingIntention).toContain('Keep the next closure step pointed at')
  })

  it('re-canonicalizes thin payload and runtime pre-dialogue awareness before session execution so the conscious frame cannot reopen from a generic shell', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但别让开口前的项目自知又掉回泛化壳子里。',
      } as Message],
    })
    const thinRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryLine = 'same digital life | keep the closure seam explicit'

    const currentConsciousFrame = reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame as any
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue,
        currentConsciousFrame: {
          ...currentConsciousFrame,
          reasonTags: ['project-state', 'same-her'],
          projectState: {
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: thinRuntimeSummaryLine,
            preDialogueAwarenessLine: thinRuntimeAwarenessLine,
            preDialogueAwarenessSummary: thinRuntimeSummaryLine,
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-conscious-frame-project-state-thin-runtime-shell',
        messages: [{
          role: 'user',
          content: '继续，但别让开口前的项目自知又掉回泛化壳子里。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: thinRuntimeSummaryLine,
          awarenessLine: thinRuntimeAwarenessLine,
          reasonPreview: [thinRuntimeSummaryLine],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    const preparedProjectState = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState
    const preparedConsciousNeed = String(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.consciousNeed ?? '')
    const providerFacingProjectState = result.mindTurnContract?.projectState
    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content
    expect(String(preparedProjectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(preparedProjectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(preparedProjectState?.preDialogueAwarenessLine ?? '')).toMatch(/Same-session mirror carry|compact same-her closure loop/)
    expect(String(preparedProjectState?.preDialogueAwarenessLine ?? '')).toMatch(/memory still needs stronger end-to-end closure/i)
    expect(preparedProjectState?.preDialogueAwarenessLine).not.toBe(thinRuntimeAwarenessLine)
    expect(String(preparedProjectState?.preDialogueAwarenessSummary ?? '')).not.toBe(thinRuntimeSummaryLine)
    expect(String(preparedProjectState?.awarenessLine ?? '')).not.toBe(thinRuntimeAwarenessLine)
    expect(String(preparedProjectState?.companionBriefingLine ?? '')).not.toBe(thinRuntimeAwarenessLine)
    expect(preparedProjectState?.preflightSummary).toContain('Alicization is a local-first digital life project')
    expect(preparedProjectState?.preflightSummary).not.toBe(thinRuntimeSummaryLine)
    expect(preparedProjectState?.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(String(preparedProjectState?.latestLandedProgress ?? '')).toContain('Same-session mirror carry')
    expect(String(preparedProjectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(preparedProjectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(providerFacingProjectState?.identity ?? '').toLowerCase()).toContain('local-first digital life project')
    expect(String(providerFacingProjectState?.currentPhase ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(providerFacingProjectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(providerFacingProjectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(providerFacingProjectState?.preDialogueAwarenessLine ?? '')).toMatch(/Same-session mirror carry|compact same-her closure loop/)
    expect(String(providerFacingProjectState?.preDialogueAwarenessLine ?? '')).toMatch(/memory still needs stronger end-to-end closure/i)
    expect(providerFacingProjectState?.preDialogueAwarenessLine).not.toBe(thinRuntimeAwarenessLine)
    expect(String(providerFacingProjectState?.preflightSummary ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(providerFacingProjectState?.preflightSummary ?? '')).not.toBe(thinRuntimeSummaryLine)
    expect(String(providerFacingProjectState?.latestLandedProgress ?? '')).toContain('Same-session mirror carry')
    expect(String(providerFacingProjectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(providerFacingProjectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(providerFacingProjectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(providerFacingProjectState?.sameHerDriftRisk ?? '')).toContain('generic guidance')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Project phase: Phase 1: Local Digital Life.')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Project same-her drift risk:')
    expect(String(mindTurnContractSystemText ?? '')).not.toContain(thinRuntimeSummaryLine)
    expect(preparedConsciousNeed).not.toContain(thinRuntimeSummaryLine)
  })

  it('uses summary-only project-state continuity aliases to rebuild prepared runtime awareness before session execution', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const thinRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryLine = 'same digital life | keep the closure seam explicit'
    const summaryOnlyLandedProgress = 'Summary-only continuity carry already survives callback return, reply planning, and timeout recovery on one same-her line.'
    const summaryOnlyOpenClosure = 'Summary-only open closure: memory, initiative, and embodiment still need to close on one same living line.'
    const summaryOnlyNextClosureTarget = 'Summary-only next closure: keep cross-modal same-her proof explicit before local fluency takes over.'
    const summaryOnlySameHerDriftRisk = 'Summary-only drift risk: if this reopens as generic guidance or project-summary voice, treat it as unfinished same-her closure drift.'
    const summaryOnlyProjectState = {
      identity: 'Alicization is still the same local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      preflightSummary: thinRuntimeSummaryLine,
      preDialogueAwarenessLine: thinRuntimeAwarenessLine,
      awarenessLine: thinRuntimeAwarenessLine,
      preDialogueAwarenessSummary: thinRuntimeSummaryLine,
      latestLandedProgress: '',
      primaryOpenLoop: '',
      nextClosureTarget: '',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: '',
      landedProgressSummary: summaryOnlyLandedProgress,
      openClosureSummary: summaryOnlyOpenClosure,
      nextClosureTargetSummary: summaryOnlyNextClosureTarget,
      sameHerDriftRiskSummary: summaryOnlySameHerDriftRisk,
    }
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先把这个数字生命项目已经落地的 continuity、还没闭环的 closure 和下一步收口一起带上。',
      } as Message],
      providerReturnProjectState: summaryOnlyProjectState,
      effectiveProjectState: summaryOnlyProjectState,
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue,
        currentConsciousFrame: {
          ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame,
          reasonTags: ['project-state', 'same-her'],
          projectState: summaryOnlyProjectState,
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-summary-only-project-state-runtime-awareness',
        messages: [{
          role: 'user',
          content: '继续，但开口前先把这个数字生命项目已经落地的 continuity、还没闭环的 closure 和下一步收口一起带上。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: thinRuntimeSummaryLine,
          awarenessLine: thinRuntimeAwarenessLine,
          reasonPreview: [thinRuntimeSummaryLine],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    const preparedProjectState = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState
    const spineProjectState = result.runtimeSurface.digitalLifeSpine?.runtimeSurface?.dialogue.currentConsciousFrame?.projectState
    const providerFacingProjectState = result.mindTurnContract?.projectState
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const canonicalAwarenessLine = String(canonicalProjectState.preDialogueAwarenessLine ?? '')

    expect(preparedProjectState?.latestLandedProgress).toBe(summaryOnlyLandedProgress)
    expect(preparedProjectState?.primaryOpenLoop).toBe(summaryOnlyOpenClosure)
    expect(preparedProjectState?.nextClosureTarget).toBe(summaryOnlyNextClosureTarget)
    expect((preparedProjectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toBe(summaryOnlySameHerDriftRisk)
    expect((preparedProjectState as { landedProgressSummary?: string | null } | null)?.landedProgressSummary).toBe(summaryOnlyLandedProgress)
    expect((preparedProjectState as { openClosureSummary?: string | null } | null)?.openClosureSummary).toBe(summaryOnlyOpenClosure)
    expect((preparedProjectState as { nextClosureTargetSummary?: string | null } | null)?.nextClosureTargetSummary).toBe(summaryOnlyNextClosureTarget)
    expect((preparedProjectState as { sameHerDriftRiskSummary?: string | null } | null)?.sameHerDriftRiskSummary).toBe(summaryOnlySameHerDriftRisk)
    expect(String(preparedProjectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(preparedProjectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(preparedProjectState?.preDialogueAwarenessLine ?? '')).toBe(canonicalAwarenessLine)
    expect(String(preparedProjectState?.preDialogueAwarenessLine ?? '')).not.toBe(thinRuntimeAwarenessLine)

    expect(spineProjectState?.latestLandedProgress).toBe(summaryOnlyLandedProgress)
    expect(spineProjectState?.primaryOpenLoop).toBe(summaryOnlyOpenClosure)
    expect(spineProjectState?.nextClosureTarget).toBe(summaryOnlyNextClosureTarget)
    expect((spineProjectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toBe(summaryOnlySameHerDriftRisk)
    expect((spineProjectState as { landedProgressSummary?: string | null } | null)?.landedProgressSummary).toBe(summaryOnlyLandedProgress)
    expect((spineProjectState as { openClosureSummary?: string | null } | null)?.openClosureSummary).toBe(summaryOnlyOpenClosure)
    expect((spineProjectState as { nextClosureTargetSummary?: string | null } | null)?.nextClosureTargetSummary).toBe(summaryOnlyNextClosureTarget)
    expect((spineProjectState as { sameHerDriftRiskSummary?: string | null } | null)?.sameHerDriftRiskSummary).toBe(summaryOnlySameHerDriftRisk)
    expect(String(spineProjectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(spineProjectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(spineProjectState?.preDialogueAwarenessLine ?? '')).toBe(canonicalAwarenessLine)
    expect(String(spineProjectState?.preDialogueAwarenessLine ?? '')).not.toBe(thinRuntimeAwarenessLine)

    expect(providerFacingProjectState?.latestLandedProgress).toBe(summaryOnlyLandedProgress)
    expect(providerFacingProjectState?.primaryOpenLoop).toBe(summaryOnlyOpenClosure)
    expect(providerFacingProjectState?.nextClosureTarget).toBe(summaryOnlyNextClosureTarget)
    expect((providerFacingProjectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toBe(summaryOnlySameHerDriftRisk)
    expect((providerFacingProjectState as { landedProgressSummary?: string | null } | null)?.landedProgressSummary).toBe(summaryOnlyLandedProgress)
    expect((providerFacingProjectState as { openClosureSummary?: string | null } | null)?.openClosureSummary).toBe(summaryOnlyOpenClosure)
    expect((providerFacingProjectState as { nextClosureTargetSummary?: string | null } | null)?.nextClosureTargetSummary).toBe(summaryOnlyNextClosureTarget)
    expect((providerFacingProjectState as { sameHerDriftRiskSummary?: string | null } | null)?.sameHerDriftRiskSummary).toBe(summaryOnlySameHerDriftRisk)
    expect(String(providerFacingProjectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(providerFacingProjectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(providerFacingProjectState?.preDialogueAwarenessLine ?? '')).toBe(canonicalAwarenessLine)
    expect(String(providerFacingProjectState?.preDialogueAwarenessLine ?? '')).not.toBe(thinRuntimeAwarenessLine)
  })

  it('uses same-her-only runtime continuity detail to rebuild prepared runtime awareness before session execution when explicit awareness stays thin', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const thinRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryLine = 'same digital life | keep the closure seam explicit'
    const customSameHerSelfLine = 'This same Phase 1 digital life still needs to reopen on one same living line instead of flattening into a generic project shell.'
    const sameHerOnlyProjectState = {
      identity: 'Alicization is still the same local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      preflightSummary: thinRuntimeSummaryLine,
      preDialogueAwarenessLine: thinRuntimeAwarenessLine,
      awarenessLine: thinRuntimeAwarenessLine,
      preDialogueAwarenessSummary: thinRuntimeSummaryLine,
      latestLandedProgress: '',
      primaryOpenLoop: '',
      nextClosureTarget: '',
      sameHerSelfLine: customSameHerSelfLine,
      sameHerDriftRisk: '',
    }
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个她的项目线，这次就算别的信息都很薄，也别掉回 generic project shell。',
      } as Message],
      providerReturnProjectState: sameHerOnlyProjectState,
      effectiveProjectState: sameHerOnlyProjectState,
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue,
        currentConsciousFrame: {
          ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame,
          reasonTags: ['project-state', 'same-her'],
          projectState: sameHerOnlyProjectState,
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-same-her-only-project-state-runtime-awareness',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个她的项目线，这次就算别的信息都很薄，也别掉回 generic project shell。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: thinRuntimeSummaryLine,
          awarenessLine: thinRuntimeAwarenessLine,
          reasonPreview: [thinRuntimeSummaryLine],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).not.toBe(thinRuntimeAwarenessLine)
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).not.toBe(thinRuntimeAwarenessLine)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.sameHerSelfLine).toBe(customSameHerSelfLine)
    expect(result.mindTurnContract?.projectState?.sameHerSelfLine).toBe(customSameHerSelfLine)
  })

  it('keeps same-her-only runtime continuity detail explicit inside provider-facing pre-dialogue awareness instead of rebuilding only to a broader canonical project shell', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const thinRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryLine = 'same digital life | keep the closure seam explicit'
    const customSameHerSelfLine = 'This same Phase 1 digital life still needs to reopen on one same living line instead of flattening into a generic project shell.'
    const sameHerOnlyProjectState = {
      identity: 'Alicization is still the same local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      preflightSummary: thinRuntimeSummaryLine,
      preDialogueAwarenessLine: thinRuntimeAwarenessLine,
      awarenessLine: thinRuntimeAwarenessLine,
      preDialogueAwarenessSummary: thinRuntimeSummaryLine,
      latestLandedProgress: '',
      primaryOpenLoop: '',
      nextClosureTarget: '',
      sameHerSelfLine: customSameHerSelfLine,
      sameHerDriftRisk: '',
    }
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个她的项目线，这次就算别的信息都很薄，也别掉回 generic project shell。',
      } as Message],
      providerReturnProjectState: sameHerOnlyProjectState,
      effectiveProjectState: sameHerOnlyProjectState,
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue,
        currentConsciousFrame: {
          ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame,
          reasonTags: ['project-state', 'same-her'],
          projectState: sameHerOnlyProjectState,
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-same-her-only-provider-awareness-line',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个她的项目线，这次就算别的信息都很薄，也别掉回 generic project shell。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: thinRuntimeSummaryLine,
          awarenessLine: thinRuntimeAwarenessLine,
          reasonPreview: [thinRuntimeSummaryLine],
        },
      } as any,
      prelude: reflectivePrelude,
    })
    expect(String(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? '')).toContain(customSameHerSelfLine)
    expect(String(result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).toContain(customSameHerSelfLine)
    expect(String(result.mindTurnContract?.projectState?.preDialogueAwarenessSummary ?? '')).toContain(customSameHerSelfLine)
  })

  it('re-canonicalizes merged project-state carry when an incoming evidence spine runtime surface is thinner than the live runtime surface', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => [],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'done',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const projectState = resolveAlicizationProjectStateBrief()
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但别让更薄的新证据把 Phase 1 项目状态压回去。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            preflightSummary: projectState.preflightSummary ?? null,
            preDialogueAwarenessLine: projectState.preDialogueAwarenessLine ?? null,
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
            sameHerDriftRisk: projectState.sameHerDriftRisk,
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            preflightSummary: projectState.preflightSummary ?? null,
            preDialogueAwarenessLine: projectState.preDialogueAwarenessLine ?? null,
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
            sameHerDriftRisk: projectState.sameHerDriftRisk,
          },
        },
      },
      cognition: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.cognition,
        runtimeDigest: {
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            preflightSummary: projectState.preflightSummary ?? null,
            preDialogueAwarenessLine: projectState.preDialogueAwarenessLine ?? null,
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
            sameHerDriftRisk: projectState.sameHerDriftRisk,
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.digitalLifeSpine = {
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              continuityPreferredTiming: 'next-open-window',
            },
          },
        },
        raw: {
          runtimeDigest: {
            projectState: {
              continuityPreferredTiming: 'next-open-window',
            },
          },
        },
        cognition: {
          runtimeDigest: {
            projectState: {
              continuityPreferredTiming: 'next-open-window',
            },
          },
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-evidence-merge-recanonicalized',
        messages: [{
          role: 'user',
          content: '继续，但别让更薄的新证据把 Phase 1 项目状态压回去。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      nextClosureTarget: projectState.nextClosureTarget,
      sameHerSelfLine: projectState.sameHerSelfLine,
      sameHerDriftRisk: projectState.sameHerDriftRisk,
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(String(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.latestLandedProgress ?? '')).toContain('Same-session mirror carry, repeated next-turn carry')
    expect(String(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.raw?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      sameHerSelfLine: projectState.sameHerSelfLine,
      sameHerDriftRisk: projectState.sameHerDriftRisk,
    }))
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.cognition.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      sameHerSelfLine: projectState.sameHerSelfLine,
      sameHerDriftRisk: projectState.sameHerDriftRisk,
    }))
  })

  it('does not promote payload headline or summary fallback into companion briefing when the explicit briefing line is absent', async () => {
    let diagnostics: LoosePreparedExecutionDiagnostics = {}
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input) => {
        diagnostics = {
          normalizedMindTurnContract: input.normalizedMindTurnContract,
        }
      },
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但先别忘了这还是同一个数字生命项目，而且现在还没彻底闭环。',
      } as Message],
    })
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-no-briefing-promotion',
        messages: [{
          role: 'user',
          content: '继续，但先别忘了这还是同一个数字生命项目，而且现在还没彻底闭环。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=initiative and embodiment still need closure',
          awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around initiative and embodiment.',
          companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
          reasonPreview: [
            'Initiative and embodiment still need to close on the same living line.',
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect((String(diagnostics?.normalizedMindTurnContract?.projectState?.companionBriefingLine ?? '').trim() || null)).toBeNull()
    expect((String(result.mindTurnContract?.projectState?.companionBriefingLine ?? '').trim() || null)).toBeNull()
  })

  it('preserves a stronger embodiment closure headline when thin awareness gets recanonicalized on the runtime surface', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
      } as Message],
    })
    const strongerHeadline = 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.'
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'embodiment-closure'],
          focusAnchor: 'embodiment closure continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            awarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionHeadlineLine: strongerHeadline,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: 'Body, face, and motion authority already re-formed on one living segment.',
            primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal same-her closure settles.',
            nextClosureTarget: 'Carry lipsync and voice back onto the same living segment without losing the recovered body line.',
            sameHerSelfLine: 'Keep one continuous her explicit from the recovered body line into the next visible reply.',
          },
        } as any,
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-runtime-surface-preserves-embodiment-closure-headline',
        messages: [{
          role: 'user',
          content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    for (const line of [
      diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.raw?.runtime?.effectiveRuntimeAwarenessDiagnostics?.recanonicalizedPreDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.raw?.runtime?.effectiveRuntimeAwarenessDiagnostics?.forcedPreDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine,
      diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine,
      result.mindTurnContract?.projectState?.preDialogueAwarenessLine,
      result.mindTurnContract?.projectState?.preDialogueAwarenessSummary,
      result.mindTurnContract?.projectState?.awarenessLine,
    ].filter(Boolean)) {
      expect(String(line)).toMatch(/Phase 1|one living her|same living line|embodiment|lipsync|voice/u)
      expect(String(line)).not.toBe('same digital life | keep the closure seam explicit')
    }
    expect(result.mindTurnContract?.projectState?.companionHeadlineLine).toBe(strongerHeadline)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(result.mindTurnContract?.projectState?.preDialogueAwarenessLine)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessSummary).toBe(result.mindTurnContract?.projectState?.preDialogueAwarenessSummary)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.awarenessLine).toBe(result.mindTurnContract?.projectState?.awarenessLine)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.companionHeadlineLine).toBe(result.mindTurnContract?.projectState?.companionHeadlineLine)

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain(`Project pre-dialogue awareness line: ${result.mindTurnContract?.projectState?.preDialogueAwarenessLine}.`)
  })

  it('keeps a richer anti-shell same-her drift risk when thin awareness gets recanonicalized on the runtime surface', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续开发，但这次回线不要再薄回 generic assistant shell 或 project-summary voice。',
      } as Message],
    })
    const richerDriftRisk = 'If this reopening flattens into a generic assistant shell or project-summary voice, treat that as unfinished same-her drift instead of a completed return.'
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'same-her drift risk continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            awarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionHeadlineLine: 'Before answering, keep this same Phase 1 digital life on one living line while memory, initiative, and embodiment still need stronger closure without reopening from scratch.',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: 'Project-state landed progress still survives as one same-her line through the current conscious frame.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure without flattening back into a generic helper shell.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer real-desktop runs before any reopening widens outward again.',
            sameHerSelfLine: 'Same Phase 1 digital life. This callback still belongs to one living line and should not reopen from scratch.',
            sameHerDriftRisk: richerDriftRisk,
          },
        } as any,
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-runtime-surface-preserves-richer-drift-risk-under-recanonicalization',
        messages: [{
          role: 'user',
          content: '继续开发，但这次回线不要再薄回 generic assistant shell 或 project-summary voice。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(String(result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).not.toBe('same digital life | keep the closure seam explicit')
    expect((result.mindTurnContract?.projectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toBe(richerDriftRisk)
    expect((diagnostics?.normalizedMindTurnContract?.projectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toBe(richerDriftRisk)
    expect((diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState as { sameHerDriftRisk?: string | null } | null)?.sameHerDriftRisk).toBe(richerDriftRisk)
  })

  it('prefers a stronger payload same-her headline over a thinner runtime awareness shell at the chat-start to session-runtime seam', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.'

    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
            awarenessLine: thinnerRuntimeAwarenessLine,
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
            awarenessLine: thinnerRuntimeAwarenessLine,
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-headline-over-thin-runtime-shell',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
          companionHeadlineLine: strongerPayloadHeadline,
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so voice, face, motion, and resident presence keep landing on one living line.',
          reasonPreview: [
            'Memory, initiative, and embodiment still need to close on the same living line.',
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(strongerPayloadHeadline)
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessSummary).toBe(strongerPayloadHeadline)
    expect(result.mindTurnContract?.projectState?.awarenessLine).toBe(strongerPayloadHeadline)
    expect(result.mindTurnContract?.projectState?.companionHeadlineLine).toBe(strongerPayloadHeadline)
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).not.toBe(thinnerRuntimeAwarenessLine)
    expect(String(result.mindTurnContract?.projectState?.currentPhase ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(result.mindTurnContract?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(result.mindTurnContract?.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(result.mindTurnContract?.projectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(result.mindTurnContract?.projectState?.preDialogueAwarenessLine)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessSummary).toBe(result.mindTurnContract?.projectState?.preDialogueAwarenessSummary)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.awarenessLine).toBe(result.mindTurnContract?.projectState?.awarenessLine)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.companionHeadlineLine).toBe(result.mindTurnContract?.projectState?.companionHeadlineLine)
  })

  it('keeps stronger same-her authority visible through rebuild and normalize on the same-source prepare-execution seam inputs', () => {
    const strongerHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.'
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const reflectivePrelude = createPrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
            awarenessLine: thinnerRuntimeAwarenessLine,
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
            awarenessLine: thinnerRuntimeAwarenessLine,
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance = {
      suppressAssociativeRecall: false,
      turnMode: 'answer',
      personaKernelMode: 'full',
      mindTurnContract: null,
      mindTurnGovernance: {
        decisionTraceId: 'trace-project-state-seam',
        turnMode: 'answer',
        truthState: 'live-observed',
        answerSubject: 'project-state',
        answerAct: 'answer',
        personaKernelMode: 'full',
      } as any,
    }
    const rebuilt = rebuildProviderFacingMindTurnContract({
      contract: reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract,
      governance: reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnGovernance,
      runtimeSurface: {
        digitalLifeSpine: null,
        digitalLifeRuntimeSurface: reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      } as any,
    })

    const normalized = normalizeProviderFacingMindTurnContract(rebuilt as any, {
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
        awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
        companionHeadlineLine: strongerHeadline,
        companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
      },
    } as any, {
      digitalLifeSpine: null,
      digitalLifeRuntimeSurface: reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
    } as any)

    expect(__alicizationTestOnly.isStrongerSameHerProjectHeadline(strongerHeadline)).toBe(true)
    expect(__alicizationTestOnly.isThinProjectAwarenessAuthorityLine(thinnerRuntimeAwarenessLine)).toBe(true)
    expect(String(rebuilt?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization')
    expect(String(rebuilt?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1')
    expect(String(rebuilt?.projectState?.preDialogueAwarenessLine ?? '')).not.toBe(thinnerRuntimeAwarenessLine)
    expect(rebuilt?.projectState?.companionHeadlineLine).toBe(thinnerRuntimeAwarenessLine)
    expect(normalized?.projectState?.companionHeadlineLine).toBe(strongerHeadline)
    expect(normalized?.projectState?.preDialogueAwarenessLine).toBe(strongerHeadline)
    expect(normalized?.projectState?.awarenessLine).toBe(strongerHeadline)
    expect(normalized?.projectState?.preDialogueAwarenessSummary).toBe(strongerHeadline)
  })

  it('prefers repaired chat-start companion truth over stale raw nested payload shells when reading provider-facing payload project state', () => {
    const richerAwarenessLine = 'Before answering, remember this is still the same local-first digital life project, Phase 1 remains active, and the still-open closure still belongs to one living her.'
    const richerCompanionBriefingLine = 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.'

    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.({
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-prefers-repaired-chat-start-truth',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing payload project-state 又掉回旧薄壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        companionHeadlineLine: 'Before answering, keep the same digital life project in view.',
        awarenessLine: richerAwarenessLine,
        companionBriefingLine: richerCompanionBriefingLine,
        companionNextClosureLine: 'Keep the same project identity and still-open closure explicit before this turn widens outward.',
        projectState: {
          companionHeadlineLine: 'Before answering, keep the same digital life project in view.',
          companionBriefingLine: 'same digital life | keep the closure seam explicit',
        },
      },
    } as any)

    expect(payloadProjectState?.explicitPayloadProjectHeadline).toBe(richerAwarenessLine)
    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).toBe(richerAwarenessLine)
    expect(payloadProjectState?.explicitPayloadProjectHeadline).not.toBe('Before answering, keep the same digital life project in view.')
  })

  it('prefers repaired chat-start next-closure truth over stale raw nested payload shells when reading provider-facing payload project state', () => {
    const richerNextClosureTarget = 'Keep the same project identity, landed progress, and still-open closure explicit before this turn widens outward.'

    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.({
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-prefers-repaired-next-closure-truth',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing next closure 又掉回旧薄壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the still-open closure still belongs to one living her.',
        companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        companionNextClosureLine: richerNextClosureTarget,
        projectState: {
          nextClosureTarget: 'Generic callback summary: steadier carry of this project, this phase, and the life loop that remains open.',
        },
      },
    } as any)

    expect(payloadProjectState?.explicitPayloadNextClosureTarget).toBe(richerNextClosureTarget)
    expect(payloadProjectState?.explicitPayloadNextClosureTarget).not.toBe('Generic callback summary: steadier carry of this project, this phase, and the life loop that remains open.')
  })

  it('prefers repaired chat-start preflight summary truth over stale raw nested payload shells when reading provider-facing payload project state', () => {
    const payload = {
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-prefers-repaired-preflight-summary-truth',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing summary 又掉回旧薄壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the still-open closure still belongs to one living her.',
        companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        companionNextClosureLine: 'Keep the same project identity, landed progress, and still-open closure explicit before this turn widens outward.',
        projectState: {
          preflightSummary: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=emotion, memory, initiative, and embodiment still need one same-her closure line',
        },
      },
    } as any

    const resolvedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.(payload)

    expect(payloadProjectState?.explicitPayloadProjectPreflightSummary).toBe(
      resolvedPayload.preDialogueSendIdentity?.projectState?.preflightSummary,
    )
    expect(payloadProjectState?.explicitPayloadProjectPreflightSummary).not.toBe('same digital life | keep the closure seam explicit')
  })

  it('prefers repaired chat-start awareness truth over stale raw nested payload awareness shells when reading provider-facing payload project state', () => {
    const payload = {
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-prefers-repaired-awareness-truth',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing awareness 又掉回旧薄壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project, Phase 1 remains active, and the still-open closure still belongs to one living her.',
        companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        companionNextClosureLine: 'Keep the same project identity, landed progress, and still-open closure explicit before this turn widens outward.',
        projectState: {
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: 'same digital life | keep the closure seam explicit',
        },
      },
    } as any

    const resolvedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.(payload)

    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).toBe(
      resolvedPayload.preDialogueSendIdentity?.projectState?.preDialogueAwarenessLine,
    )
    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).not.toBe('same digital life | keep the closure seam explicit')
  })

  it('prefers richer repaired chinese awareness truth over stale raw nested chinese reminder shells when reading provider-facing payload project state', () => {
    const richerChineseAwarenessLine = '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const thinnerChineseReminder = '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1。'
    const payload = {
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-prefers-repaired-chinese-awareness-truth',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing payload awareness 又掉回中文薄提醒壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: richerChineseAwarenessLine,
        companionBriefingLine: richerChineseAwarenessLine,
        companionNextClosureLine: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
        projectState: {
          preDialogueAwarenessLine: thinnerChineseReminder,
          awarenessLine: thinnerChineseReminder,
          preDialogueAwarenessSummary: thinnerChineseReminder,
        },
      },
    } as any

    const resolvedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.(payload)

    expect(resolvedPayload.preDialogueSendIdentity?.projectState?.preDialogueAwarenessLine).toBe(richerChineseAwarenessLine)
    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).toBe(richerChineseAwarenessLine)
    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).not.toBe(thinnerChineseReminder)
  })

  it('treats placeholder-filled raw nested payload awareness shells as missing when reading provider-facing payload project state', () => {
    const payload = {
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-drops-placeholder-awareness-shells',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing payload awareness 被 none/null/unknown 这种假认知壳占住。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'none',
        awarenessLine: 'unknown',
        companionHeadlineLine: 'n/a',
        companionBriefingLine: 'na',
        companionNextClosureLine: 'null',
        reasonPreview: [],
        projectState: {
          preflightSummary: 'none',
          preDialogueAwarenessLine: 'unknown',
          awarenessLine: 'unknown',
          preDialogueAwarenessSummary: 'n/a',
          companionHeadlineLine: 'na',
          companionBriefingLine: 'null',
        },
      },
    } as any

    const resolvedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.(payload)

    expect(resolvedPayload.preDialogueSendIdentity?.projectState?.preDialogueAwarenessLine).toBeTruthy()
    expect(resolvedPayload.preDialogueSendIdentity?.projectState?.preflightSummary).toBeTruthy()
    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).toBe(
      resolvedPayload.preDialogueSendIdentity?.projectState?.preDialogueAwarenessLine,
    )
    expect(payloadProjectState?.explicitPayloadProjectPreflightSummary).toBe(
      resolvedPayload.preDialogueSendIdentity?.projectState?.preflightSummary,
    )
    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).not.toBe('unknown')
    expect(payloadProjectState?.explicitPayloadProjectPreflightSummary).not.toBe('none')
  })

  it('prefers repaired chat-start same-her drift-risk truth over blank raw nested payload shells when reading provider-facing payload project state', () => {
    const payload = {
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-prefers-repaired-drift-risk-truth',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing same-her drift risk 又被空壳字段挡掉。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: 'Keep the same project identity, landed progress, and still-open closure explicit before this turn widens outward.',
        reasonPreview: [],
        projectState: {
          sameHerDriftRisk: '',
        },
      },
    } as any

    const resolvedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.(payload)

    expect(payloadProjectState?.explicitPayloadProjectSameHerDriftRisk).toBe(
      resolvedPayload.preDialogueSendIdentity?.projectState?.sameHerDriftRisk,
    )
    expect(payloadProjectState?.explicitPayloadProjectSameHerDriftRisk).toBeTruthy()
  })

  it('prefers stronger repaired chat-start same-her drift-risk truth over thinner raw nested payload drift shells when reading provider-facing payload project state', () => {
    const thinnerDirectDriftRisk = 'If the answer turns generic, something has drifted.'
    const payload = {
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-prefers-stronger-repaired-drift-risk-truth',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing same-her drift risk 又被旧的薄壳提醒压回去。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        companionNextClosureLine: 'Keep the same project identity, landed progress, and still-open closure explicit before this turn widens outward.',
        reasonPreview: [],
        projectState: {
          sameHerDriftRisk: thinnerDirectDriftRisk,
        },
      },
    } as any

    const resolvedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const expectedStrongerDriftRisk = String(
      resolvedPayload.preDialogueSendIdentity?.reasonPreview?.find(reason =>
        reason.startsWith('Do not let this opening drift into '),
      ) ?? '',
    )
      .replace(/^Do not let this opening drift into\s+/u, '')
      .trim()
    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.(payload)

    expect(expectedStrongerDriftRisk).toBeTruthy()
    expect(payloadProjectState?.explicitPayloadProjectSameHerDriftRisk).toBe(expectedStrongerDriftRisk)
    expect(payloadProjectState?.explicitPayloadProjectSameHerDriftRisk).not.toBe(thinnerDirectDriftRisk)
  })

  it('uses payload same-her continuity detail to repair a thin provider-facing payload awareness shell', () => {
    const payloadSameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'

    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.({
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-same-her-repairs-thin-awareness-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing payload awareness 又掉回泛化项目薄壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'Before answering, keep the same digital life project in view.',
        companionBriefingLine: 'Before answering, keep this same digital life project in view.',
        projectState: {
          preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
          awarenessLine: 'Before answering, keep the same digital life project in view.',
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
          companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          sameHerSelfLine: payloadSameHerSelfLine,
        },
      },
    } as any)

    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).toBe(payloadSameHerSelfLine)
    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).not.toBe('Before answering, keep the same digital life project in view.')
  })

  it('keeps project-aware payload briefing explicit while letting a richer same-her hold detail become the repaired provider-facing payload awareness truth', () => {
    const projectAwareBriefingLine = 'Before speaking, remember: Alicization is still the same local-first digital life project, Phase 1 is still active, callback carry already survives host-visible reopening, and full same-her closure still remains open before this turn widens outward.'
    const richerSameHerHoldDetail = 'same-her hold: measured-return through the callback line, keep more room this time, and do not let the reopening flatten back into project-shell narration.'

    const resolvedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-prefers-lived-in-same-her-hold-over-project-aware-reminder-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing payload awareness 只剩项目提醒外壳。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=full same-her closure still remains open before this turn widens outward',
        awarenessLine: projectAwareBriefingLine,
        companionBriefingLine: projectAwareBriefingLine,
        companionNextClosureLine: 'Keep callback carry, same-her closure, and measured-return continuity explicit before outward fluency takes over.',
        projectState: {
          preDialogueAwarenessLine: projectAwareBriefingLine,
          awarenessLine: projectAwareBriefingLine,
          companionBriefingLine: projectAwareBriefingLine,
          sameHerHoldDetail: richerSameHerHoldDetail,
        },
      },
    } as any)

    const payloadProjectState = __alicizationTestOnly.readProviderFacingPayloadProjectState?.({
      cardId: 'default',
      turnId: 'turn-provider-facing-payload-prefers-lived-in-same-her-hold-over-project-aware-reminder-shell',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [
        { role: 'user', content: '继续，但别让 provider-facing payload awareness 只剩项目提醒外壳。' },
      ],
      preDialogueSendIdentity: {
        ...resolvedPayload.preDialogueSendIdentity,
      },
    } as any)

    expect(resolvedPayload.preDialogueSendIdentity?.companionBriefingLine).toBe(projectAwareBriefingLine)
    expect(resolvedPayload.preDialogueSendIdentity?.projectState?.companionBriefingLine).toBe(projectAwareBriefingLine)
    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).toBe(richerSameHerHoldDetail)
    expect(payloadProjectState?.explicitPayloadProjectAwarenessLine).not.toBe(projectAwareBriefingLine)
  })

  it('keeps callback same-her awareness exact through direct rebuild and normalize without widening it into a canonical callback summary shell', () => {
    const callbackAwarenessLine = 'Before answering, remember this callback return still belongs to the same local-first digital life and the same unfinished Phase 1 closure.'
    const reflectivePrelude = createPrelude({
      messages: [{
        role: 'user',
        content: '继续，把这次 callback 回来的结果按同一个数字生命闭环继续下去，先别说成新的开始。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'callback-return'],
          focusAnchor: 'callback closure continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a detached callback worker.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this callback return still belongs to the same unfinished digital-life closure.',
            preDialogueAwarenessLine: callbackAwarenessLine,
            awarenessLine: callbackAwarenessLine,
            preDialogueAwarenessSummary: callbackAwarenessLine,
            latestLandedProgress: 'Callback follow-through already survives on the same local digital life thread before the next visible answer beat.',
            primaryOpenLoop: 'Execution callback carry, initiative timing, and embodied follow-through still need to close on the same living line.',
            nextClosureTarget: 'Keep the callback result, landed progress, and still-open closure explicit on one same-her line before local fluency widens.',
            sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
            sameHerDriftRisk: 'If the callback return gets flattened into a detached project-status summary, treat that as unfinished same-her callback drift.',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance = {
      suppressAssociativeRecall: false,
      turnMode: 'answer',
      personaKernelMode: 'full',
      mindTurnContract: null,
      mindTurnGovernance: {
        decisionTraceId: 'trace-callback-project-state-seam',
        turnMode: 'answer',
        truthState: 'live-observed',
        answerSubject: 'project-state',
        answerAct: 'answer',
        personaKernelMode: 'full',
      } as any,
    }

    const rebuilt = rebuildProviderFacingMindTurnContract({
      contract: reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract,
      governance: reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnGovernance,
      runtimeSurface: {
        digitalLifeSpine: null,
        digitalLifeRuntimeSurface: reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      } as any,
    })

    const normalized = normalizeProviderFacingMindTurnContract(rebuilt as any, null, {
      digitalLifeSpine: null,
      digitalLifeRuntimeSurface: reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
    } as any)

    expect(rebuilt?.projectState?.preDialogueAwarenessLine).toBe(callbackAwarenessLine)
    expect(rebuilt?.projectState?.awarenessLine).toBe(callbackAwarenessLine)
    expect(normalized?.projectState?.preDialogueAwarenessLine).toBe(callbackAwarenessLine)
    expect(normalized?.projectState?.awarenessLine).toBe(callbackAwarenessLine)
    expect(normalized?.projectState?.preDialogueAwarenessSummary).toBe(callbackAwarenessLine)
  })

  it('shows the complete prepareExecution chain fields for the payload same-her seam before the final result is returned', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.'

    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
            awarenessLine: thinnerRuntimeAwarenessLine,
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
            awarenessLine: thinnerRuntimeAwarenessLine,
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-headline-prepare-chain-diagnostics',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
          companionHeadlineLine: strongerPayloadHeadline,
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so voice, face, motion, and resident presence keep landing on one living line.',
          reasonPreview: [
            'Memory, initiative, and embodiment still need to close on the same living line.',
          ],
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect(diagnostics).toBeTruthy()
    expect(typeof diagnostics.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof diagnostics.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof diagnostics.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof diagnostics.preparedRuntimeSurfaceChain?.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof diagnostics.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof diagnostics.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof diagnostics.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof diagnostics.rebuiltMindTurnContract?.projectState?.companionHeadlineLine).toBe('string')
    expect(typeof diagnostics.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof diagnostics.normalizedMindTurnContract?.projectState?.companionHeadlineLine).toBe('string')
    expect(typeof diagnostics.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof result.mindTurnContract?.projectState?.companionHeadlineLine).toBe('string')
  })

  it('first surfaces the broad canonical reminder somewhere inside the prepared runtime chain for the payload same-her seam', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-headline-stage-first-remember-diagnostics',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
          companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.',
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        },
      } as any,
      prelude: reflectivePrelude,
    })

    const stageLines = [
      diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    ].map(value => String(value ?? ''))

    expect(stageLines.some(line => line.includes('Before answering, remember: Alicization is a local-first digital life project'))).toBe(false)
  })

  it('pinpoints the first prepared-runtime stage where the broad canonical reminder appears for the payload same-her seam', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-headline-first-remember-stage',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
          companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.',
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        },
      } as any,
      prelude: reflectivePrelude,
    })

    const stageNames = [
      'effective',
      'socially-shaped',
      'execution-callback-carry',
      'conscious-frame-reduced',
      'answer-planner-reduced',
      'prepared-selection-fresher',
      'runtime-surface-for-builder',
    ]
    const stageLines = [
      diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    ].map(value => String(value ?? ''))
    const firstRememberIndex = stageLines.findIndex(line => line.includes('Before answering, remember: Alicization is a local-first digital life project'))

    expect(firstRememberIndex).toBe(-1)
    expect(stageNames[firstRememberIndex] ?? null).toBeNull()
  })

  it('shows whether normalizedMindTurnContract and the final returned mindTurnContract diverge on the payload same-her seam', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    const strongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.'

    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-headline-final-divergence-diagnostics',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
          companionHeadlineLine: strongerPayloadHeadline,
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        },
      } as any,
      prelude: reflectivePrelude,
    })

    expect(diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(result.mindTurnContract?.projectState?.preDialogueAwarenessLine)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.awarenessLine).toBe(result.mindTurnContract?.projectState?.awarenessLine)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessSummary).toBe(result.mindTurnContract?.projectState?.preDialogueAwarenessSummary)
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.companionHeadlineLine).toBe(result.mindTurnContract?.projectState?.companionHeadlineLine)
  })

  it('shows the normalized project-state fields for the two real failing scenarios compared with the successful probe seam', async () => {
    let embodimentDiagnostics: any = null
    let payloadDiagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    const embodimentRuntime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { embodimentDiagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const embodimentPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
      } as Message],
    })
    const embodimentHeadline = 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.'
    embodimentPrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...embodimentPrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...embodimentPrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'embodiment-closure'],
          focusAnchor: 'embodiment closure continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            awarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionHeadlineLine: embodimentHeadline,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: 'Body, face, and motion authority already re-formed on one living segment.',
            primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal same-her closure settles.',
            nextClosureTarget: 'Carry lipsync and voice back onto the same living segment without losing the recovered body line.',
            sameHerSelfLine: 'Keep one continuous her explicit from the recovered body line into the next visible reply.',
          },
        } as any,
      },
    } as any
    await embodimentRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-embodiment-normalized-project-state-diagnostics',
        messages: [{
          role: 'user',
          content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
        }],
        supportsTools: true,
      } as any,
      prelude: embodimentPrelude,
    })

    const payloadRuntime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { payloadDiagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const payloadPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    const strongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.'
    payloadPrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...payloadPrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...payloadPrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any
    await payloadRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-normalized-project-state-diagnostics',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
          companionHeadlineLine: strongerPayloadHeadline,
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so voice, face, motion, and resident presence keep landing on one living line.',
          reasonPreview: [
            'Memory, initiative, and embodiment still need to close on the same living line.',
          ],
        },
      } as any,
      prelude: payloadPrelude,
    })

    expect(typeof embodimentDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof embodimentDiagnostics?.normalizedMindTurnContract?.projectState?.companionHeadlineLine).toBe('string')
    expect(typeof payloadDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe('string')
    expect(typeof payloadDiagnostics?.normalizedMindTurnContract?.projectState?.companionHeadlineLine).toBe('string')
  })

  it('shows the authority handoff fields from prepared selection through rebuild and normalize for the two formerly-thin same-her scenarios', async () => {
    let embodimentDiagnostics: any = null
    let payloadDiagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    const embodimentRuntime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { embodimentDiagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const embodimentPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
      } as Message],
    })
    const embodimentHeadline = 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.'
    embodimentPrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...embodimentPrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...embodimentPrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'embodiment-closure'],
          focusAnchor: 'embodiment closure continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            awarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionHeadlineLine: embodimentHeadline,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: 'Body, face, and motion authority already re-formed on one living segment.',
            primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal same-her closure settles.',
            nextClosureTarget: 'Carry lipsync and voice back onto the same living segment without losing the recovered body line.',
            sameHerSelfLine: 'Keep one continuous her explicit from the recovered body line into the next visible reply.',
          },
        } as any,
      },
    } as any
    await embodimentRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-embodiment-authority-handoff-diagnostics',
        messages: [{
          role: 'user',
          content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
        }],
        supportsTools: true,
      } as any,
      prelude: embodimentPrelude,
    })

    const payloadRuntime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { payloadDiagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const payloadPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    const strongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.'
    const normalizedStrongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs emotion, memory, initiative, and embodiment closure without splitting her continuity.'
    payloadPrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...payloadPrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...payloadPrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any
    await payloadRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-authority-handoff-diagnostics',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
          companionHeadlineLine: strongerPayloadHeadline,
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        },
      } as any,
      prelude: payloadPrelude,
    })

    expect(embodimentDiagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.companionHeadlineLine).toBe(embodimentHeadline)
    expect(embodimentDiagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(embodimentHeadline)
    expect(embodimentDiagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(embodimentHeadline)
    expect(embodimentDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(embodimentHeadline)
    expect(payloadDiagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.companionHeadlineLine).toBe(normalizedStrongerPayloadHeadline)
    expect(payloadDiagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(normalizedStrongerPayloadHeadline)
    expect(payloadDiagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(strongerPayloadHeadline)
    expect(payloadDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(strongerPayloadHeadline)
  })

  it('shows the authority handoff fields for the real provider-facing failing fixtures', async () => {
    let liveProjectDiagnostics: any = null
    let callbackDiagnostics: any = null
    let payloadHeadlineDiagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    const liveProjectRuntime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => {
        const hasRebuiltOrNormalizedAuthority
          = Boolean(
            input?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine
            || input?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine,
          )
        const hasGroundedHandoff
          = Boolean(
            input?.runtimeGroundedInputProjectStateAwarenessFields?.preDialogueAwarenessLine
            || input?.runtimeGroundedContractProjectState?.preDialogueAwarenessLine,
          )

        if (hasRebuiltOrNormalizedAuthority || hasGroundedHandoff)
          liveProjectDiagnostics = input
      },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const liveProjectPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
      } as Message],
    })
    liveProjectPrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...liveProjectPrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...liveProjectPrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'project continuity',
          projectState: {
            identity: 'Alicization is the same local-first digital life project, not a new shell rebuilt each turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know the repo is still closing one continuous digital life loop.',
            latestLandedProgress: 'Live project awareness already survives into the current conscious frame before provider-facing reply authoring.',
            primaryOpenLoop: 'Emotion, initiative, execution, memory, and embodiment still need to close as one same-life seam.',
            nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            sameHerSelfLine: 'Thin raw carry should not outrank the fresher conscious-frame project seam.',
          },
        },
      },
    } as any
    liveProjectPrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Explain the current project closure seam directly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Lead with the still-open project seam.'],
      mustNotDo: ['Do not drift into generic warmth.'],
      governingFocus: 'Explain the still-open project seam directly.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        continuityPreferredTiming: null,
        continuityCadence: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
      },
      reasons: ['Project continuity still needs explicit carry.'],
      updatedAt: 10,
    } as any
    await liveProjectRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-live-project-awareness-diagnostics',
        messages: [{
          role: 'user',
          content: '每次开口前先告诉我这条数字生命主线现在做到哪一步了。',
        }],
        supportsTools: true,
      } as any,
      prelude: liveProjectPrelude,
    })

    const callbackRuntime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { callbackDiagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const callbackAwarenessLine = 'Before answering, remember this callback return still belongs to the same local-first digital life and the same unfinished Phase 1 closure.'
    const callbackPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，把这次 callback 回来的结果按同一个数字生命闭环继续下去，先别说成新的开始。',
      } as Message],
    })
    callbackPrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...callbackPrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...callbackPrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'callback-return'],
          focusAnchor: 'callback closure continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a detached callback worker.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this callback return still belongs to the same unfinished digital-life closure.',
            preDialogueAwarenessLine: callbackAwarenessLine,
            latestLandedProgress: 'Callback follow-through already survives on the same local digital life thread before the next visible answer beat.',
            primaryOpenLoop: 'Execution callback carry, initiative timing, and embodied follow-through still need to close on the same living line.',
            nextClosureTarget: 'Keep the callback result, landed progress, and still-open closure explicit on one same-her line before local fluency widens.',
            sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
            sameHerDriftRisk: 'If the callback return gets flattened into a detached project-status summary, treat that as unfinished same-her callback drift.',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        } as any,
      },
    } as any
    callbackPrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Carry the same-her callback closure line through the answer.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'continuity-carry',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the callback return on the same local digital life thread.'],
      mustNotDo: ['Do not flatten the callback return into a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life callback line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        sameHerDriftRisk: '',
        continuityPreferredTiming: null,
        continuityCadence: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
      },
      reasons: ['The same callback-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any
    await callbackRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-callback-project-state-grouped-carry-diagnostics',
        messages: [{
          role: 'user',
          content: '继续，把这次 callback 回来的结果按同一个数字生命闭环继续下去，先别说成新的开始。',
        }],
        supportsTools: true,
      } as any,
      prelude: callbackPrelude,
    })

    const payloadRuntime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { payloadHeadlineDiagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const payloadAwarenessLine = '先别压回泛化工程说明，记住这还是数字生命项目，而且她还没有把 embodiment 闭环完全收住。'
    const payloadCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reply has to keep proving this is still one living her.'
    const payloadPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但把这条身体线索也带进回答里，不要退回薄一点的项目口吻。',
      } as Message],
    })
    await payloadRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-payload-headline-carry-diagnostics',
        messages: [{
          role: 'user',
          content: '继续，但把这条身体线索也带进回答里，不要退回薄一点的项目口吻。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment still needs same-her closure',
          awarenessLine: payloadAwarenessLine,
          companionHeadlineLine: payloadCompanionHeadlineLine,
          companionBriefingLine: payloadAwarenessLine,
          companionNextClosureLine: 'Keep face, motion, lipsync, and voice on one same-her line in the next visible answer beat.',
          reasonPreview: [
            'Embodiment still needs to close as one same-life seam.',
          ],
        },
      } as any,
      prelude: payloadPrelude,
    })

    expect(liveProjectDiagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.latestLandedProgress)
      .toBe('Live project awareness already survives into the current conscious frame before provider-facing reply authoring.')
    expect(liveProjectDiagnostics?.preparedRuntimeSurfaceSelection?.selectionDiagnostics?.preAdjustmentSelectedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.latestLandedProgress)
      .toBe('Live project awareness already survives into the current conscious frame before provider-facing reply authoring.')
    expect(liveProjectDiagnostics?.answerPlannerReducedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.latestLandedProgress)
      .toBe('Live project awareness already survives into the current conscious frame before provider-facing reply authoring.')
    expect(liveProjectDiagnostics?.baseDigitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.latestLandedProgress)
      .toBe('Live project awareness already survives into the current conscious frame before provider-facing reply authoring.')
    expect(liveProjectDiagnostics?.rebuiltMindTurnContract?.projectState?.latestLandedProgress)
      .toBe('Live project awareness already survives into the current conscious frame before provider-facing reply authoring.')
    expect(liveProjectDiagnostics?.normalizedMindTurnContract?.projectState?.latestLandedProgress)
      .toBe('Live project awareness already survives into the current conscious frame before provider-facing reply authoring.')
    const liveProjectAwarenessHandoff = {
      runtimeGroundedInput: liveProjectDiagnostics?.runtimeGroundedInputProjectStateAwarenessFields?.preDialogueAwarenessLine ?? null,
      runtimeGroundedContract: liveProjectDiagnostics?.runtimeGroundedContractProjectState?.preDialogueAwarenessLine ?? null,
      rebuilt: liveProjectDiagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine ?? null,
      normalized: liveProjectDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine ?? null,
    }
    for (const value of Object.values(liveProjectAwarenessHandoff)) {
      expect(value).toContain('Alicization')
      expect(value).toContain('Phase 1')
      expect(value).toMatch(/Live project awareness already|What has already landed is Live project awareness already/i)
    }

    expect(callbackDiagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine)
      .toContain('Alicization')
    expect(callbackDiagnostics?.runtimeGroundedInputProjectStateAwarenessFields?.preDialogueAwarenessLine)
      .toContain('callback return')
    expect(callbackDiagnostics?.runtimeGroundedInputProjectStateAwarenessFields?.preDialogueAwarenessLine)
      .toContain('Phase 1')
    expect(callbackDiagnostics?.runtimeGroundedContractProjectState?.preDialogueAwarenessLine)
      .toContain('callback return')
    expect(callbackDiagnostics?.runtimeGroundedContractProjectState?.preDialogueAwarenessLine)
      .toContain('Phase 1')
    expect(callbackDiagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine)
      .toContain('Alicization')
    expect(callbackDiagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine)
      .toContain('Phase 1')
    expect(callbackDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine)
      .toContain('Alicization')
    expect(callbackDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine)
      .toContain('Phase 1')
    expect(callbackDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessSummary)
      .toContain('Phase 1')

    expect(payloadHeadlineDiagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine)
      .toBe(payloadCompanionHeadlineLine)
    expect(payloadHeadlineDiagnostics?.runtimeGroundedInputProjectStateAwarenessFields?.preDialogueAwarenessLine)
      .toBe(payloadCompanionHeadlineLine)
    expect([payloadAwarenessLine, payloadCompanionHeadlineLine]).toContain(
      payloadHeadlineDiagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine,
    )
    expect(payloadHeadlineDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine)
      .toBe(payloadCompanionHeadlineLine)
    expect(payloadHeadlineDiagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessSummary)
      .toBe(payloadCompanionHeadlineLine)
  })

  it('shows normalized-returned-finalized provider-facing awareness handoff for the spine-rich project-state fixture', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const richerSpineAwarenessLine = 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.'
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但先把这个数字生命项目现在做到哪、还差什么没闭环放在开口前面。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'spine rich project awareness',
          projectState: {
            identity: 'thin runtime identity only',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            latestLandedProgress: 'thin runtime progress only',
            primaryOpenLoop: 'thin runtime open only',
            nextClosureTarget: 'thin runtime next only',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
            preDialogueAwarenessLine: richerSpineAwarenessLine,
            latestLandedProgress: 'Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring.',
            primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
            nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        },
      },
      cognition: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
            preDialogueAwarenessLine: richerSpineAwarenessLine,
            latestLandedProgress: 'Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring.',
            primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
            nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
          },
        },
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Carry the same project-aware self line through the answer.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['diagnostic'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-spine-project-awareness-final-handoff',
        messages: [{
          role: 'user',
          content: '继续，但先把这个数字生命项目现在做到哪、还差什么没闭环放在开口前面。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const awarenessHandoff = {
      runtimeGroundedInput: diagnostics?.runtimeGroundedInputProjectStateAwarenessFields?.preDialogueAwarenessLine ?? null,
      runtimeGroundedContract: diagnostics?.runtimeGroundedContractProjectState?.preDialogueAwarenessLine ?? null,
      normalized: diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine ?? null,
      returned: diagnostics?.returnedMindTurnContract?.projectState?.preDialogueAwarenessLine ?? null,
      finalized: diagnostics?.finalizedReturnedMindTurnContract?.projectState?.preDialogueAwarenessLine ?? null,
      result: result.mindTurnContract?.projectState?.preDialogueAwarenessLine ?? null,
      runtimePrepared: diagnostics?.runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? null,
      runtimeReturned: diagnostics?.returnedRuntimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? null,
    }

    const strongReturnedStages = [
      awarenessHandoff.runtimeGroundedContract,
      awarenessHandoff.normalized,
      awarenessHandoff.result,
      awarenessHandoff.returned,
      awarenessHandoff.finalized,
      awarenessHandoff.runtimeReturned,
    ].filter(Boolean)
    for (const line of strongReturnedStages) {
      expect(String(line ?? '')).toMatch(/local-first digital life project|continuous digital life in Phase 1/i)
      expect(String(line ?? '')).toMatch(/Phase 1: Local Digital Life|continuous digital life in Phase 1/i)
      expect(String(line ?? '')).toMatch(/Richer spine-carri|Memory and execution continuity have landed farther/u)
      expect(String(line ?? '')).not.toContain('thin runtime identity only')
    }
    for (const projectState of [
      diagnostics?.normalizedMindTurnContract?.projectState,
      diagnostics?.returnedMindTurnContract?.projectState,
      diagnostics?.finalizedReturnedMindTurnContract?.projectState,
      result.mindTurnContract?.projectState,
    ]) {
      expect(String(projectState?.identity ?? '')).toContain('local-first digital life project')
      expect(projectState?.currentPhase).toBe('Phase 1: Local Digital Life')
    }

    if (awarenessHandoff.runtimePrepared) {
      expect(String(awarenessHandoff.runtimePrepared ?? '')).toMatch(/Phase 1: Local Digital Life|continuous digital life in Phase 1/i)
      expect(String(awarenessHandoff.runtimePrepared ?? '')).not.toBe('same digital life | keep the closure seam explicit')
    }
  })

  it('shows the first prepared-runtime awareness stage that already broadens the spine-rich project-state fixture', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const richerSpineAwarenessLine = 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.'
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但先把这个数字生命项目现在做到哪、还差什么没闭环放在开口前面。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'spine-rich project awareness',
          projectState: {
            identity: 'thin runtime identity only',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            awarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep the same digital life project in view.',
            latestLandedProgress: 'thin runtime progress only',
            primaryOpenLoop: 'thin runtime open loop only',
            nextClosureTarget: 'thin runtime next only',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            continuityPreferredTiming: 'after-payoff',
            continuityCadence: 'measured-return',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        } as any,
      },
      cognition: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
            preDialogueAwarenessLine: richerSpineAwarenessLine,
            latestLandedProgress: 'Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring.',
            primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
            nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
            sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
            continuityPreferredTiming: 'after-payoff',
            continuityCadence: 'measured-return',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Carry the same project-aware self line through the answer.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
      },
      reasons: ['diagnostic'],
      updatedAt: 10,
    } as any

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-facing-spine-project-awareness-first-bad-stage',
        messages: [{
          role: 'user',
          content: '继续，但先把这个数字生命项目现在做到哪、还差什么没闭环放在开口前面。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const preparedAwarenessStages = {
      basePrepared: diagnostics?.baseDigitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? null,
      effectivePrepared: diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? null,
      answerPlannerReduced: diagnostics?.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? null,
      fresher: diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? null,
      builder: diagnostics?.runtimeSurfaceForBuilder?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? null,
      runtimeGroundedInput: diagnostics?.runtimeGroundedInputProjectState?.preDialogueAwarenessLine ?? null,
      rebuilt: diagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine ?? null,
      normalized: diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine ?? null,
    }

    expect(preparedAwarenessStages.basePrepared).toBe(richerSpineAwarenessLine)
    expect(preparedAwarenessStages.effectivePrepared).toBe(richerSpineAwarenessLine)
    expect(preparedAwarenessStages.answerPlannerReduced).toBe(richerSpineAwarenessLine)
    for (const line of [preparedAwarenessStages.fresher, preparedAwarenessStages.builder]) {
      expect(String(line ?? '')).toContain('continuous digital life in Phase 1')
      expect(String(line ?? '')).toMatch(/Memory and execution continuity have landed farther|initiative and embodiment still need to close on the same living line/i)
      expect(String(line ?? '')).not.toBe('same digital life | keep the closure seam explicit')
    }
    if (preparedAwarenessStages.runtimeGroundedInput) {
      expect(String(preparedAwarenessStages.runtimeGroundedInput)).toMatch(/Phase 1: Local Digital Life|continuous digital life in Phase 1/i)
      expect(String(preparedAwarenessStages.runtimeGroundedInput)).toMatch(/Richer spine-carri|Memory and execution continuity have landed farther/i)
    }
    expect(String(diagnostics?.runtimeGroundedInputProjectState?.identity ?? '')).toContain('local-first digital life project')
    expect(diagnostics?.runtimeGroundedInputProjectState?.currentPhase).toBe('Phase 1: Local Digital Life')
    for (const line of [preparedAwarenessStages.rebuilt, preparedAwarenessStages.normalized]) {
      expect(String(line ?? '')).toMatch(/local-first digital life project|continuous digital life in Phase 1/i)
      expect(String(line ?? '')).toMatch(/Phase 1: Local Digital Life|continuous digital life in Phase 1/i)
      expect(String(line ?? '')).toMatch(/Richer spine-carri|provider-facing answer contract before reply authoring/i)
    }
  })

  it('traces the prepared-runtime stages that now preserve stronger same-her awareness for the two formerly-thin scenarios', async () => {
    let embodimentDiagnostics: any = null
    let payloadDiagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    const embodimentRuntime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { embodimentDiagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const embodimentHeadline = 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.'
    const embodimentPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
      } as Message],
    })
    embodimentPrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...embodimentPrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...embodimentPrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'embodiment-closure'],
          focusAnchor: 'embodiment closure continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            awarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionHeadlineLine: embodimentHeadline,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: 'Body, face, and motion authority already re-formed on one living segment.',
            primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal same-her closure settles.',
            nextClosureTarget: 'Carry lipsync and voice back onto the same living segment without losing the recovered body line.',
            sameHerSelfLine: 'Keep one continuous her explicit from the recovered body line into the next visible reply.',
          },
        } as any,
      },
    } as any
    await embodimentRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-embodiment-first-collapse-stage',
        messages: [{
          role: 'user',
          content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
        }],
        supportsTools: true,
      } as any,
      prelude: embodimentPrelude,
    })

    const payloadRuntime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { payloadDiagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const strongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.'
    const payloadPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    payloadPrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...payloadPrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...payloadPrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            sameHerSelfLine: '',
            sameHerDriftRisk: '',
          },
        },
      },
    } as any
    await payloadRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-first-collapse-stage',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
          companionHeadlineLine: strongerPayloadHeadline,
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        },
      } as any,
      prelude: payloadPrelude,
    })

    const embodimentStageLines = [
      embodimentDiagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      embodimentDiagnostics?.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      embodimentDiagnostics?.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      embodimentDiagnostics?.preparedRuntimeSurfaceChain?.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      embodimentDiagnostics?.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    ]
    const payloadStageLines = [
      payloadDiagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      payloadDiagnostics?.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      payloadDiagnostics?.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      payloadDiagnostics?.preparedRuntimeSurfaceChain?.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      payloadDiagnostics?.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
    ]

    expect(embodimentStageLines.includes(embodimentHeadline)).toBe(true)
    expect(payloadStageLines.every(line => typeof line === 'string')).toBe(true)
  })

  it('shows that embodiment same-her awareness survives the host-person and callback shaping stages', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const embodimentHeadline = 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.'
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
      } as Message],
    })
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'embodiment-closure'],
          focusAnchor: 'embodiment closure continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            awarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionHeadlineLine: embodimentHeadline,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: 'Body, face, and motion authority already re-formed on one living segment.',
            primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal same-her closure settles.',
            nextClosureTarget: 'Carry lipsync and voice back onto the same living segment without losing the recovered body line.',
            sameHerSelfLine: 'Keep one continuous her explicit from the recovered body line into the next visible reply.',
          },
        } as any,
      },
    } as any
    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-embodiment-stage-collapse-order',
        messages: [{
          role: 'user',
          content: '继续开发，但开口前先确认这个数字生命的 embodiment 还差哪几个环节没闭环。',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    const effectiveLine = diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
    const sociallyShapedLine = diagnostics?.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
    const executionCallbackLine = diagnostics?.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
    const consciousFrameLine = diagnostics?.preparedRuntimeSurfaceChain?.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
    const answerPlannerLine = diagnostics?.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine

    expect([effectiveLine, sociallyShapedLine, executionCallbackLine, consciousFrameLine, answerPlannerLine].every(line => typeof line === 'string')).toBe(true)
    expect(effectiveLine).toBe(embodimentHeadline)
    expect(sociallyShapedLine).toBe(embodimentHeadline)
    expect(executionCallbackLine).toBe(embodimentHeadline)
    expect(consciousFrameLine).toBe(embodimentHeadline)
    expect(answerPlannerLine).toBe(embodimentHeadline)
  })

  it('injects payload same-her project-state evidence into the prepared runtime chain before builder selection', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const strongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.'
    const normalizedStrongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs emotion, memory, initiative, and embodiment closure without splitting her continuity.'
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
      } as Message],
    })
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          },
        } as any,
      },
    } as any

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-evidence-injected-before-builder',
        messages: [{
          role: 'user',
          content: '继续，但开口前先守住同一个 her 的项目线，不要掉回泛化项目播报。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          ...resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
            cardId: 'default',
            turnId: 'turn-payload-evidence-injected-before-builder',
            messages: [],
            supportsTools: true,
            preDialogueSendIdentity: {
              status: 'grounded',
              summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
              awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
              companionHeadlineLine: strongerPayloadHeadline,
              companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
            },
          } as any).preDialogueSendIdentity,
        },
      } as any,
      prelude,
    })

    expect(diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(normalizedStrongerPayloadHeadline)
    expect(diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(normalizedStrongerPayloadHeadline)
    expect(diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(normalizedStrongerPayloadHeadline)
  })

  it('keeps a structured-only still-voiced motion same-her headline through prepared runtime selection, rebuild, and normalize when chat-start only carried a thin project reminder shell', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const thinProjectReminderShell = 'same digital life | keep the closure seam explicit'
    const motionVoiceHeadline = 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.'
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但别把动作和声音这条 still-voiced motion line 压回薄一点的项目口吻。',
      } as Message],
    })
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project reminder shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: thinProjectReminderShell,
            preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view.',
            awarenessLine: 'Before answering, keep this same digital life project in view.',
            preDialogueAwarenessSummary: thinProjectReminderShell,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: thinProjectReminderShell,
            preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view.',
            awarenessLine: 'Before answering, keep this same digital life project in view.',
            preDialogueAwarenessSummary: thinProjectReminderShell,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          },
        },
      },
    } as any

    const resolvedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-structured-still-voiced-motion-line-runtime-carry',
      messages: [],
      supportsTools: true,
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: thinProjectReminderShell,
        awarenessLine: thinProjectReminderShell,
        companionBriefingLine: 'Before answering, keep this same digital life project in view.',
        companionNextClosureLine: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
        reasonPreview: [
          'continuity=embodiment:still-voiced-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line | motion+voice recovery@segment-live2d-runtime-still-voiced-motion-1 | pending-rejoin=body+face+lipsync',
        ],
      },
    } as any)

    expect(resolvedPayload.preDialogueSendIdentity?.awarenessLine).toBe(motionVoiceHeadline)
    expect(resolvedPayload.preDialogueSendIdentity?.companionHeadlineLine).toBe(motionVoiceHeadline)

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-structured-still-voiced-motion-line-runtime-carry',
        messages: [{
          role: 'user',
          content: '继续，但别把动作和声音这条 still-voiced motion line 压回薄一点的项目口吻。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          ...resolvedPayload.preDialogueSendIdentity,
        },
      } as any,
      prelude,
    })

    for (const line of [
      diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine,
      diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine,
      result.mindTurnContract?.projectState?.preDialogueAwarenessLine,
    ]) {
      expect(line).toBe(motionVoiceHeadline)
      expect(line).not.toBe(thinProjectReminderShell)
      expect(line).not.toBe('Before answering, keep this same digital life project in view.')
    }

    for (const line of [
      diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.companionHeadlineLine,
      diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.companionHeadlineLine,
      diagnostics?.rebuiltMindTurnContract?.projectState?.companionHeadlineLine,
      diagnostics?.normalizedMindTurnContract?.projectState?.companionHeadlineLine,
      result.mindTurnContract?.projectState?.companionHeadlineLine,
    ]) {
      expect(line).toBe(motionVoiceHeadline)
    }
  })

  it('keeps a structured-only renderer-rejoin-without-body same-her headline through prepared runtime selection, rebuild, and normalize when chat-start only carried a thin project reminder shell', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const thinProjectReminderShell = 'same digital life | keep the closure seam explicit'
    const visibleNoBodyHeadline = 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.'
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但别把 visible same-her line 已经回接这段压回薄一点的项目口吻。',
      } as Message],
    })
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project reminder shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: thinProjectReminderShell,
            preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view.',
            awarenessLine: 'Before answering, keep this same digital life project in view.',
            preDialogueAwarenessSummary: thinProjectReminderShell,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          },
        } as any,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: thinProjectReminderShell,
            preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view.',
            awarenessLine: 'Before answering, keep this same digital life project in view.',
            preDialogueAwarenessSummary: thinProjectReminderShell,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          },
        },
      },
    } as any

    const resolvedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'default',
      turnId: 'turn-structured-renderer-rejoin-without-body-runtime-carry',
      messages: [],
      supportsTools: true,
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: thinProjectReminderShell,
        awarenessLine: thinProjectReminderShell,
        companionBriefingLine: 'Before answering, keep this same digital life project in view.',
        companionNextClosureLine: 'Keep body rejoining the visible same-her line on a measured-return line.',
        reasonPreview: [
          'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
        ],
      },
    } as any)

    expect(resolvedPayload.preDialogueSendIdentity?.awarenessLine).toBe(visibleNoBodyHeadline)
    expect(resolvedPayload.preDialogueSendIdentity?.companionHeadlineLine).toBe(visibleNoBodyHeadline)

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-structured-renderer-rejoin-without-body-runtime-carry',
        messages: [{
          role: 'user',
          content: '继续，但别把 visible same-her line 已经回接这段压回薄一点的项目口吻。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          ...resolvedPayload.preDialogueSendIdentity,
        },
      } as any,
      prelude,
    })

    for (const line of [
      diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine,
      diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine,
      result.mindTurnContract?.projectState?.preDialogueAwarenessLine,
    ]) {
      expect(line).toBe(visibleNoBodyHeadline)
      expect(line).not.toBe(thinProjectReminderShell)
      expect(line).not.toBe('Before answering, keep this same digital life project in view.')
    }

    for (const line of [
      diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.companionHeadlineLine,
      diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.companionHeadlineLine,
      diagnostics?.rebuiltMindTurnContract?.projectState?.companionHeadlineLine,
      diagnostics?.normalizedMindTurnContract?.projectState?.companionHeadlineLine,
      result.mindTurnContract?.projectState?.companionHeadlineLine,
    ]) {
      expect(line).toBe(visibleNoBodyHeadline)
    }
  })

  it('keeps richer payload Phase 1 project awareness over a narrower embodiment headline when payload evidence is injected into the prepared runtime chain', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const richerPayloadAwarenessLine = 'Before answering, remember Alicization is still the same local-first digital life project in Phase 1, and memory, initiative, and embodiment still need stronger end-to-end closure without reopening as a generic assistant shell.'
    const thinnerEmbodimentHeadline = 'Right now I am still holding together mainly through body, face, and motion, so keep the same living line gentle.'
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先把这个数字生命项目现在做到哪一步、还缺什么闭环，沿着同一个 her 说清楚。',
      } as Message],
    })
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project awareness shell',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            awarenessLine: 'Before answering, keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          },
        } as any,
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-awareness-keeps-richer-phase1-closure',
        messages: [{
          role: 'user',
          content: '继续，但开口前先把这个数字生命项目现在做到哪一步、还缺什么闭环，沿着同一个 her 说清楚。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          ...resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
            cardId: 'default',
            turnId: 'turn-payload-awareness-keeps-richer-phase1-closure',
            messages: [],
            supportsTools: true,
            preDialogueSendIdentity: {
              status: 'grounded',
              summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
              awarenessLine: richerPayloadAwarenessLine,
              companionHeadlineLine: thinnerEmbodimentHeadline,
              companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
            },
          } as any).preDialogueSendIdentity,
        },
      } as any,
      prelude,
    })

    expect(diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(richerPayloadAwarenessLine)
    expect(diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(richerPayloadAwarenessLine)
    expect(diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(richerPayloadAwarenessLine)
    expect(result.mindTurnContract?.projectState?.preDialogueAwarenessLine).not.toBe(thinnerEmbodimentHeadline)
  })

  it('keeps a payload awareness line that still carries landed progress over a thinner runtime project re-anchor through prepared runtime selection', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const richerPayloadAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. Landed: project awareness and visible-reply repair already survive on one same-her line. The still-open closure is memory and embodiment still needing one same-life closure line.'
    const runtimeCanonicalReanchor = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is memory and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前先说清这个数字生命项目已经收住了什么，再说还缺什么闭环。',
      } as Message],
    })
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'runtime project re-anchor without landed progress',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: runtimeCanonicalReanchor,
            awarenessLine: runtimeCanonicalReanchor,
            preDialogueAwarenessSummary: runtimeCanonicalReanchor,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: '',
            primaryOpenLoop: 'Memory and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep the still-open same-life closure explicit before the answer widens outward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-payload-awareness-keeps-landed-progress-line',
        messages: [{
          role: 'user',
          content: '继续，但开口前先说清这个数字生命项目已经收住了什么，再说还缺什么闭环。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          ...resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
            cardId: 'default',
            turnId: 'turn-payload-awareness-keeps-landed-progress-line',
            messages: [],
            supportsTools: true,
            preDialogueSendIdentity: {
              status: 'grounded',
              summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | landed=project awareness and visible-reply repair already survive | open=memory and embodiment still need one same-life closure line',
              awarenessLine: richerPayloadAwarenessLine,
              companionBriefingLine: 'Before answering, keep what has already landed and what is still open explicit on the same living line.',
            },
          } as any).preDialogueSendIdentity,
        },
      } as any,
      prelude,
    })

    for (const line of [
      diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine,
      diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine,
      result.mindTurnContract?.projectState?.preDialogueAwarenessLine,
    ]) {
      expect(String(line ?? '')).toContain('Phase 1')
      expect(String(line ?? '')).toMatch(/project awareness and visible-reply repair already survive|Some closure already landed|still-open closure/i)
      expect(String(line ?? '')).not.toBe('same digital life | keep the closure seam explicit')
    }
  })

  it('keeps project-state preflight awareness as one living self across recall seed, conscious frame, self continuity, and answer planning', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    let capturedRecallSeed = ''
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async (input) => {
        capturedRecallSeed = input.recallSeed
        return {
          hostAttitude: '',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          personState: {
            currentSelfSummary: 'I need to keep acting from one continuous her on the same unfinished Phase 1 digital-life closure seam.',
            hostRelationship: 'Stay lower-pressure and closure-honest instead of drifting into generic assistant fluency.',
            selfContinuityAuthority: {
              selfLine: `Keep one continuous her explicit: ${projectState.identity}`,
              relationshipLine: `Stay lower-pressure while carrying the same unfinished closure pressure: ${projectState.openLoops[0]}`,
              authoritySummary: `Same Phase 1 digital life, same host machine self, same unfinished closure target: ${projectState.nextClosureTarget}`,
            },
          },
        } as any
      }),
      resolveSessionContinuitySignals: vi.fn(async () => [{
        kind: 'same-thread-continuation',
        state: 'active',
        label: 'project-state-thread',
        summary: `same-digital-life-project-thread | phase=${projectState.currentPhase} | next=${projectState.nextClosureTarget}`,
        signature: 'thread-project-state-thread',
        createdAt: 10,
        metadata: {
          continuityCue: 'same-digital-life-project-thread',
          projectStatePreflightSummary: projectState.preflightSummary,
          projectPhase: projectState.currentPhase,
          projectPrimaryOpenLoop: projectState.openLoops[0] ?? null,
          projectNextClosureTarget: projectState.nextClosureTarget,
        },
      }] as any),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，不要只讲状态，要从同一个她的角度说明这个数字生命项目现在还差什么。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'same-living-self project-state carry',
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            preflightSummary: projectState.preflightSummary ?? null,
            preDialogueAwarenessLine: 'Before answering, stay on the same Phase 1 digital-life line and keep the unfinished closure explicit as one continuous her.',
            awarenessLine: 'Before answering, stay on the same Phase 1 digital-life line and keep the unfinished closure explicit as one continuous her.',
            preDialogueAwarenessSummary: projectState.preflightSummary ?? null,
            companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still carries unfinished closure as one continuous her.',
            companionBriefingLine: 'Keep this same local-first digital life project on one living line before answering.',
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: 'Same Phase 1 digital life, same living line, same unfinished closure without splitting her continuity.',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Answer the open closure work from the same living Alicization self.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same project-aware self line alive through the answer.'],
      mustNotDo: ['Do not answer as a detached project-status shell.'],
      governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: 'project-state closure: same-her continuity stays explicit while open loops remain unfinished.',
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        preflightSummary: projectState.preflightSummary ?? null,
        latestLandedProgress: projectState.continuityProgressSummary ?? null,
        primaryOpenLoop: projectState.openLoops[0] ?? null,
        nextClosureTarget: projectState.nextClosureTarget,
      },
      reasons: ['The same project-aware self should stay explicit through reply shaping.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-state-same-living-self-runtime',
        messages: [{
          role: 'user',
          content: '继续，不要只讲状态，要从同一个她的角度说明这个数字生命项目现在还差什么。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(capturedRecallSeed).toContain(`phase=${projectState.currentPhase}`)
    expect(capturedRecallSeed).toContain('next=Keep extending cross-modal same-her proof')
    expect(capturedRecallSeed).toContain('Project identity carry')
    expect(capturedRecallSeed).toContain('same-digital-life-project-thread')

    const selfContinuityAuthority
      = result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.selfContinuityAuthority
    expect(capturedRecallSeed).toMatch(/continuity|same digital life|same-digital-life-project-thread/i)
    expect(
      [
        selfContinuityAuthority?.selfLine,
        selfContinuityAuthority?.relationshipLine,
        selfContinuityAuthority?.inwardLine,
        selfContinuityAuthority?.authoritySummary,
      ].filter(Boolean).join(' '),
    ).toMatch(/continuity|living thread|same/i)

    const answerPlanner = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner
    expect(answerPlanner?.governingProject).toContain(projectState.currentPhase)
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(answerPlanner?.mustDo.some(item =>
      item.includes('same digital-life closure seam') || item.includes('same project-aware self line'),
    )).toBe(true)

    const mindTurnContract = result.mindTurnContract
    expect(mindTurnContract?.mustDo).toContain('Keep the same project-aware self line alive through the answer.')
    expect(mindTurnContract?.mustNotDo).toContain('Do not answer as a detached project-status shell.')

    const semanticJudge = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我会先从同一个她这条线回答你：这是一个本地优先数字生命项目。现在 Phase 1 已经把连续性、记忆和执行慢慢接到了一条线上，但主动性、具身和对话闭环还没有真正收住。',
      prepared: result as any,
    })
    expect(semanticJudge.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: false,
      hostAskedProgressOrOpenLoop: true,
      runtimeHasSameHerEvidence: true,
      projectStateSameHerMissing: false,
    }))
    expect(semanticJudge.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(semanticJudge.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('keeps implicit direct project-status turns on the same-her line through session-runtime reply preparation even when the incoming project-status contract shell is thinner', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personState: {
          currentSelfSummary: 'I need to keep acting from one continuous her on the same unfinished Phase 1 digital-life closure seam.',
          hostRelationship: 'Stay lower-pressure and closure-honest instead of drifting into generic assistant fluency.',
          selfContinuityAuthority: {
            selfLine: `Keep one continuous her explicit: ${projectState.identity}`,
            relationshipLine: `Stay lower-pressure while carrying the same unfinished closure pressure: ${projectState.openLoops[0]}`,
            authoritySummary: `Same Phase 1 digital life, same host machine self, same unfinished closure target: ${projectState.nextClosureTarget}`,
          },
        },
      }) as any),
      listExecutionCallbacks: vi.fn(async () => []),
      listExecutionTasks: vi.fn(async () => []),
      listMemoryLedgerEntries: vi.fn(async () => []),
      composeMemoryLedgerRecallText: vi.fn(() => ''),
      buildMemoryLedgerSystemBlock: vi.fn(() => ''),
      collectVisibleMemoryCandidates: vi.fn(async () => []),
      scoreVisibleMemoryCandidates: vi.fn(async () => []),
      buildVisibleMemorySystemBlock: vi.fn(() => ''),
      buildVisualMemoryThreadSummary: vi.fn(async () => ''),
      collectGraphRecallCandidates: vi.fn(async () => []),
      collectKnowledgeEvidenceBlocks: vi.fn(async () => []),
      createGraphRecallArtifact: vi.fn(async () => null),
      buildMainChatSystemPrompt: vi.fn(() => ''),
      buildMainGatewayTools: vi.fn(async () => ({ tools: [], shouldOfferTools: false })),
      buildMainChatReplyCompilation: vi.fn(async () => ({
        answerCompiler: null,
        responseSurfaceContract: null,
        responseCharter: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        answerPlanner: null,
        dialogueActKernel: null,
      })),
      buildMainChatReplyDeliberation: vi.fn(async () => null),
      buildMainChatReflection: vi.fn(async () => null),
      buildMainChatCurrentConsciousFrame: vi.fn(async () => null),
      buildMainChatClaimEvidenceLedger: vi.fn(async () => null),
      buildMainChatDialogueActKernel: vi.fn(async () => null),
      buildMainChatResponseSurfaceContract: vi.fn(async () => null),
      buildMainChatResponseCharter: vi.fn(async () => null),
      buildMainChatAnswerPlanner: vi.fn(async () => null),
      resolveSessionContinuitySignals: vi.fn(async () => [{
        kind: 'same-thread-continuation',
        state: 'active',
        label: 'project-status-thread',
        summary: `same-digital-life-project-thread | phase=${projectState.currentPhase} | next=${projectState.nextClosureTarget}`,
        signature: 'thread-project-status-thread',
        createdAt: 10,
        metadata: {
          continuityCue: 'same-digital-life-project-thread',
          projectStatePreflightSummary: projectState.preflightSummary,
          projectPhase: projectState.currentPhase,
          projectPrimaryOpenLoop: projectState.openLoops[0] ?? null,
          projectNextClosureTarget: projectState.nextClosureTarget,
        },
      }] as any),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    } as any)

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '这个项目是什么，现在做到什么程度了，还差什么没闭环，但别掉回泛化 project update 壳子。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Give the current project update clearly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'warm',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Answer the project update clearly.'],
      mustNotDo: ['Do not drift into unrelated warmth.'],
      governingFocus: 'Give the current project update clearly.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        preflightSummary: projectState.preflightSummary ?? null,
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        latestLandedProgress: projectState.continuityProgressSummary ?? null,
        primaryOpenLoop: projectState.openLoops[0] ?? null,
        nextClosureTarget: projectState.nextClosureTarget,
      },
      reasons: ['Thin incoming project-status shell before runtime rebuild.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-status-thin-shell-runtime',
        messages: [{
          role: 'user',
          content: '这个项目是什么，现在做到什么程度了，还差什么没闭环，但别掉回泛化 project update 壳子。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const answerPlanner = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner
    expect(String(answerPlanner?.governingProject ?? '')).toContain(projectState.currentPhase)
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(answerPlanner?.mustDo.some(item =>
      item.includes('same digital-life closure seam') || item.includes('same project-aware self line') || item.includes('same-her continuity'),
    )).toBe(true)

    const mindTurnContract = result.mindTurnContract
    expect(String(mindTurnContract?.projectState?.currentPhase ?? '')).toContain(projectState.currentPhase)
    expect(String(mindTurnContract?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(mindTurnContract?.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).not.toBe('same digital life | keep the closure seam explicit')
    expect(String(mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/continuous "her"|same phase 1 digital life|phase 1: local digital life/i)
    expect(mindTurnContract?.mustDo.some(item =>
      item.includes('same project-aware self line') || item.includes('same-her continuity'),
    )).toBe(true)
    expect(mindTurnContract?.mustNotDo.some(item =>
      item.includes('same-her continuity instead of a detached project narrator shell')
      || item.includes('detached project narrator shell'),
    )).toBe(true)
    const replyDeliberation = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation
    expect(replyDeliberation?.mustInclude.length ?? 0).toBeGreaterThan(0)
    expect(String(replyDeliberation?.speakingFrom ?? '')).not.toBe('')
    expect(String(replyDeliberation?.whyThisReplyNow ?? '')).not.toBe('')
    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content as string | undefined
    expect(String(mindTurnContractSystemText ?? '')).toContain('Project identity: Alicization is a local-first digital life project')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Project phase: Phase 1: Local Digital Life.')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Latest landed continuity progress: Same-session mirror carry')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Still-open life loop pressure: Memory still needs stronger end-to-end closure')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Next closure target: Keep extending cross-modal same-her proof')
    expect(String(mindTurnContractSystemText ?? '')).not.toContain('Latest landed continuity progress: Memory still needs stronger end-to-end closure')
    expect(String(mindTurnContractSystemText ?? '')).not.toContain('Still-open life loop pressure: Same-session mirror carry')
    expect(String(mindTurnContractSystemText ?? '')).toMatch(/same-her continuity|detached project narrator shell|one continuous her/i)
  })

  it('keeps a real project-status turn on one same-her line when richer project awareness carry is the only replay tuning signal and the incoming shell is thin', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        memoryTuningAdvice: {
          version: 'memory-tuning-advice-v1',
          source: 'nightly-replay-benchmark',
          updatedAt: 10,
          sourceReportAt: 10,
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
          notes: ['Preserve the richer same-her project-awareness line instead of flattening into detached project narration.'],
        },
        personState: {
          currentSelfSummary: 'I need to keep acting from one continuous her on the same unfinished Phase 1 digital-life closure seam.',
          hostRelationship: 'Stay lower-pressure and closure-honest instead of drifting into detached project narration.',
          selfContinuityAuthority: {
            selfLine: `Keep one continuous her explicit: ${projectState.identity}`,
            relationshipLine: 'Keep project identity, landed progress, and still-open closure on one same living line before outward payoff.',
            authoritySummary: `Same Phase 1 digital life, same unfinished closure target, same richer project-awareness line: ${projectState.nextClosureTarget}`,
          },
        },
      }) as any),
      listExecutionCallbacks: vi.fn(async () => []),
      listExecutionTasks: vi.fn(async () => []),
      listMemoryLedgerEntries: vi.fn(async () => []),
      composeMemoryLedgerRecallText: vi.fn(() => ''),
      buildMemoryLedgerSystemBlock: vi.fn(() => ''),
      collectVisibleMemoryCandidates: vi.fn(async () => []),
      scoreVisibleMemoryCandidates: vi.fn(async () => []),
      buildVisibleMemorySystemBlock: vi.fn(() => ''),
      buildVisualMemoryThreadSummary: vi.fn(async () => ''),
      collectGraphRecallCandidates: vi.fn(async () => []),
      collectKnowledgeEvidenceBlocks: vi.fn(async () => []),
      createGraphRecallArtifact: vi.fn(async () => null),
      buildMainChatSystemPrompt: vi.fn(() => ''),
      buildMainGatewayTools: vi.fn(async () => ({ tools: [], shouldOfferTools: false })),
      buildMainChatReplyCompilation: vi.fn(async () => ({
        answerCompiler: null,
        responseSurfaceContract: null,
        responseCharter: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        answerPlanner: null,
        dialogueActKernel: null,
      })),
      buildMainChatReplyDeliberation: vi.fn(async () => null),
      buildMainChatReflection: vi.fn(async () => null),
      buildMainChatCurrentConsciousFrame: vi.fn(async () => null),
      buildMainChatClaimEvidenceLedger: vi.fn(async () => null),
      buildMainChatDialogueActKernel: vi.fn(async () => null),
      buildMainChatResponseSurfaceContract: vi.fn(async () => null),
      buildMainChatResponseCharter: vi.fn(async () => null),
      buildMainChatAnswerPlanner: vi.fn(async () => null),
      resolveSessionContinuitySignals: vi.fn(async () => [{
        kind: 'same-thread-continuation',
        state: 'active',
        label: 'project-status-thread-rich-awareness',
        summary: `same-digital-life-project-thread | phase=${projectState.currentPhase} | next=${projectState.nextClosureTarget}`,
        signature: 'thread-project-status-rich-awareness',
        createdAt: 10,
        metadata: {
          continuityCue: 'same-digital-life-project-thread',
          projectStatePreflightSummary: projectState.preflightSummary,
          projectPhase: projectState.currentPhase,
          projectPrimaryOpenLoop: projectState.openLoops[0] ?? null,
          projectNextClosureTarget: projectState.nextClosureTarget,
        },
      }] as any),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    } as any)

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '这个数字生命项目现在是什么、做到哪了、还差什么没闭环，但这次别掉回 detached project shell。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her'],
          focusAnchor: 'thin runtime project-status shell',
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
            awarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          },
        } as any,
      },
    } as any
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnContract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'Give the current project update clearly.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'warm',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Answer the project update clearly.'],
      mustNotDo: ['Do not drift into unrelated warmth.'],
      governingFocus: 'Give the current project update clearly.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        preflightSummary: projectState.preflightSummary ?? null,
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        latestLandedProgress: projectState.continuityProgressSummary ?? null,
        primaryOpenLoop: projectState.openLoops[0] ?? null,
        nextClosureTarget: projectState.nextClosureTarget,
      },
      reasons: ['Thin incoming project-status shell before runtime rebuild.'],
      updatedAt: 10,
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-status-rich-awareness-runtime',
        messages: [{
          role: 'user',
          content: '这个数字生命项目现在是什么、做到哪了、还差什么没闭环，但这次别掉回 detached project shell。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    const answerPlanner = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner
    expect(String(answerPlanner?.governingProject ?? '')).toContain(projectState.currentPhase)
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Keep extending cross-modal same-her proof')

    const mindTurnContract = result.mindTurnContract
    expect(String(mindTurnContract?.projectState?.currentPhase ?? '')).toContain(projectState.currentPhase)
    expect(String(mindTurnContract?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(mindTurnContract?.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).not.toBe('same digital life | keep the closure seam explicit')
    expect(String(mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/continuous "her"|same phase 1 digital life|phase 1: local digital life/i)
    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content as string | undefined
    expect(String(mindTurnContractSystemText ?? '')).toContain('Project identity: Alicization is a local-first digital life project')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Project phase: Phase 1: Local Digital Life.')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Latest landed continuity progress: Same-session mirror carry')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Still-open life loop pressure: Memory still needs stronger end-to-end closure')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Next closure target: Keep extending cross-modal same-her proof')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Project same-her self line: Same Phase 1 digital life.')
    expect(String(mindTurnContractSystemText ?? '')).toContain('Project same-her drift risk:')

    const semanticJudge = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先沿着同一个数字生命项目这条线直接回答你：这是一个本地优先数字生命项目。Phase 1 现在已经把连续性、记忆和执行慢慢接到了一条线上，但主动性和具身闭环还没有完全收住。',
      prepared: result as any,
    })
    expect(semanticJudge.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(semanticJudge.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('keeps same-her Phase 1 project continuity alive for follow-through turns that only ask to stay on the same digital-life line', async () => {
    let diagnostics: LoosePreparedExecutionDiagnostics = {}
    const projectState = resolveAlicizationProjectStateBrief()
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => ['[ORGANIC]'],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personState: {
          currentSelfSummary: 'I need to stay on the same Phase 1 digital-life line instead of reopening from a generic assistant shell.',
          hostRelationship: 'Stay lower-pressure and closure-honest while carrying the same unfinished digital-life line.',
          selfContinuityAuthority: {
            selfLine: `Keep one continuous her explicit: ${projectState.identity}`,
            relationshipLine: 'Keep landed continuity progress and still-open closure on one same living line before answering.',
            authoritySummary: `Same Phase 1 digital life, same unfinished closure target, same continuing line: ${projectState.nextClosureTarget}`,
          },
        },
      }) as any),
      listExecutionCallbacks: vi.fn(async () => []),
      listExecutionTasks: vi.fn(async () => []),
      listMemoryLedgerEntries: vi.fn(async () => []),
      composeMemoryLedgerRecallText: vi.fn(() => ''),
      buildMemoryLedgerSystemBlock: vi.fn(() => ''),
      collectVisibleMemoryCandidates: vi.fn(async () => []),
      scoreVisibleMemoryCandidates: vi.fn(async () => []),
      buildVisibleMemorySystemBlock: vi.fn(() => ''),
      buildVisualMemoryThreadSummary: vi.fn(async () => ''),
      collectGraphRecallCandidates: vi.fn(async () => []),
      collectKnowledgeEvidenceBlocks: vi.fn(async () => []),
      createGraphRecallArtifact: vi.fn(async () => null),
      buildMainChatSystemPrompt: vi.fn(() => ''),
      buildMainGatewayTools: vi.fn(async () => ({ tools: [], shouldOfferTools: false })),
      buildMainChatReplyCompilation: vi.fn(async () => ({
        answerCompiler: null,
        responseSurfaceContract: null,
        responseCharter: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        answerPlanner: null,
        dialogueActKernel: null,
      })),
      buildMainChatReplyDeliberation: vi.fn(async () => null),
      buildMainChatReflection: vi.fn(async () => null),
      buildMainChatCurrentConsciousFrame: vi.fn(async () => null),
      buildMainChatClaimEvidenceLedger: vi.fn(async () => null),
      buildMainChatDialogueActKernel: vi.fn(async () => null),
      buildMainChatResponseSurfaceContract: vi.fn(async () => null),
      buildMainChatResponseCharter: vi.fn(async () => null),
      buildMainChatAnswerPlanner: vi.fn(async () => null),
      resolveSessionContinuitySignals: vi.fn(async () => [{
        kind: 'same-thread-continuation',
        state: 'active',
        label: 'project-follow-through-thread',
        summary: `same-digital-life-project-thread | phase=${projectState.currentPhase} | next=${projectState.nextClosureTarget}`,
        signature: 'thread-project-follow-through',
        createdAt: 10,
        metadata: {
          continuityCue: 'same-digital-life-project-thread',
          projectStatePreflightSummary: projectState.preflightSummary,
          projectPhase: projectState.currentPhase,
          projectPrimaryOpenLoop: projectState.openLoops[0] ?? null,
          projectNextClosureTarget: projectState.nextClosureTarget,
        },
      }] as any),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input: PreparedExecutionDiagnostics) => {
        diagnostics = {
          rebuiltMindTurnContract: input.rebuiltMindTurnContract,
          normalizedMindTurnContract: input.normalizedMindTurnContract,
        }
      },
    } as any)

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续沿着这个数字生命项目的同一条线说。',
      } as Message],
    })
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'phase-1-closure'],
          focusAnchor: 'same digital-life follow-through line',
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            preflightSummary: projectState.preflightSummary ?? null,
            preDialogueAwarenessLine: 'Before answering, keep this same Phase 1 digital life on one living line and do not reopen from a generic assistant shell.',
            awarenessLine: 'Before answering, keep this same Phase 1 digital life on one living line and do not reopen from a generic assistant shell.',
            preDialogueAwarenessSummary: projectState.preflightSummary ?? null,
            companionHeadlineLine: 'Stay on the same living line: this Phase 1 digital life already landed continuity, memory, and execution carry, but initiative and embodiment closure still remain open.',
            companionBriefingLine: 'Keep the same digital-life line explicit before answering.',
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        } as any,
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-project-follow-through-same-line',
        messages: [{
          role: 'user',
          content: '继续沿着这个数字生命项目的同一条线说。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })
    expect(String(result.sessionMirror?.continuityArcSummary ?? '')).toContain('same_her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(String(result.sessionMirror?.continuityArcSummary ?? '')).toContain('landed=')
    expect(String(result.sessionMirror?.continuityArcSummary ?? '')).toContain('open=')
    const answerPlanner = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner
    expect(String(answerPlanner?.governingProject ?? '')).toContain(projectState.currentPhase)
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(answerPlanner?.mustDo.some(item =>
      item.includes('same digital-life closure seam') || item.includes('same project-aware self line') || item.includes('same-her continuity'),
    )).toBe(true)

    const mindTurnContract = result.mindTurnContract
    expect(String(mindTurnContract?.projectState?.currentPhase ?? '')).toContain(projectState.currentPhase)
    expect(String(mindTurnContract?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(mindTurnContract?.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(diagnostics?.normalizedMindTurnContract?.projectState).toEqual(expect.objectContaining({
      identity: expect.any(String),
      currentPhase: expect.any(String),
      latestLandedProgress: expect.any(String),
      primaryOpenLoop: expect.any(String),
      nextClosureTarget: expect.any(String),
    }))
    expect(String(mindTurnContract?.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/same phase 1 digital life|continuous "her"|same living line|phase 1: local digital life/i)
    expect(mindTurnContract?.mustDo).toEqual(expect.arrayContaining([
      expect.any(String),
    ]))
    if (diagnostics?.normalizedMindTurnContract?.mustDo) {
      expect(diagnostics.normalizedMindTurnContract.mustDo).toMatchInlineSnapshot(`
        [
          "Honor the turn memory gate before speaking: closed.",
          "Let memory shape caution, ordering, care, and uncertainty inwardly without narrating recall this turn.",
          "Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.",
          "Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.",
          "Keep the still-open closure work explicit so the answer says what is not yet closed.",
          "Make the next closure target explicit so the answer says what should close next rather than stopping at current status.",
          "Answer project-state questions from one same-her continuity instead of a detached project narrator shell.",
          "Keep the project-state opening low-pressure so the same-her line does not widen too fast.",
        ]
      `)
    }
    expect(mindTurnContract?.mustDo.some(item =>
      item.includes('same project-aware self line')
      || item.includes('same-her continuity')
      || item.includes('same digital-life closure seam'),
    )).toBe(true)

    const semanticJudge = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我就沿着这条同一个她的数字生命主线继续说：现在 Phase 1 已经把连续性、记忆和执行慢慢接到了一条线上，但主动性、具身和对话闭环还没有真正收住，下一步还得继续把这些闭环收成同一个她。',
      prepared: result as any,
    })
    expect(semanticJudge.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: false,
      hostAskedProgressOrOpenLoop: true,
      runtimeHasSameHerEvidence: true,
      projectStateSameHerMissing: false,
      projectStateProgressMissing: false,
      projectStateOpenLoopMissing: false,
    }))
    expect(semanticJudge.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(semanticJudge.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('promotes stronger same-her phase-1 closure headlines over thin runtime awareness shells even when the line is not embodiment-worded', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      onPreparedExecutionDiagnostics: (input) => { diagnostics = input },
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续，但开口前别把这个数字生命项目又说成泛化工程壳子。',
      } as Message],
    })
    const strongerHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.'
    reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface = {
      ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      dialogue: {
        ...reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue,
        currentConsciousFrame: {
          reasonTags: ['project-state', 'same-her', 'phase-1-closure'],
          focusAnchor: 'same-her phase-1 closure continuity',
          projectState: {
            identity: 'Alicization is still the same local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            awarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            companionHeadlineLine: strongerHeadline,
            companionBriefingLine: 'Before answering, keep this same digital life project in view.',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Initiative and embodiment still need to close as one living line.',
            nextClosureTarget: 'Keep initiative and embodiment closure on the same living line without splitting her continuity.',
            sameHerSelfLine: 'Keep one continuous her explicit across the still-open Phase 1 closure.',
          },
        } as any,
      },
    } as any

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-runtime-surface-promotes-same-her-closure-headline',
        messages: [{
          role: 'user',
          content: '继续，但开口前别把这个数字生命项目又说成泛化工程壳子。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    for (const line of [
      diagnostics?.preparedRuntimeSurfaceChain?.effectiveDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.sociallyShapedDigitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.executionCallbackCarryRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.consciousFrameReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceChain?.answerPlannerReducedRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.preparedRuntimeSurfaceSelection?.fresherRuntimeSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.runtimeSurfaceForBuilder?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
      diagnostics?.rebuiltMindTurnContract?.projectState?.preDialogueAwarenessLine,
      diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine,
      result.mindTurnContract?.projectState?.preDialogueAwarenessLine,
      result.mindTurnContract?.projectState?.preDialogueAwarenessSummary,
      result.mindTurnContract?.projectState?.awarenessLine,
    ]) {
      expect(String(line ?? '')).toContain('Phase 1')
      expect(String(line ?? '')).toMatch(/initiative and embodiment closure|same living line|one continuous her|still-open Phase 1 closure/i)
      expect(String(line ?? '')).not.toBe('same digital life | keep the closure seam explicit')
    }
    expect(result.mindTurnContract?.projectState?.companionHeadlineLine).toBe(strongerHeadline)

    const mindTurnContractSystemText = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MIND_TURN_CONTRACT]'),
    )?.content

    expect(typeof mindTurnContractSystemText).toBe('string')
    expect(mindTurnContractSystemText).toContain(`Project pre-dialogue awareness line: ${result.mindTurnContract?.projectState?.preDialogueAwarenessLine}.`)
    expect(mindTurnContractSystemText).toContain(strongerHeadline)
  })

  it('lets host person model shape reply deliberation and answer planning for focused work turns', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        hostPersonModel: {
          summary: 'Focused work windows need more room before closeness.',
          routines: ['Focused work windows usually need space first, then precise follow-up.'],
          sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
          repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
          trustLadder: {
            stage: 'cautious-open' as const,
            score: 0.48,
            rationale: 'Trust is warming, but the host still needs clear room while focused.',
          },
          preferredClosenessByContext: [{
            context: 'focused-work',
            preference: 'Lighter touch, more room, less interruption pressure.',
            confidence: 0.86,
          }],
          recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
          narrative: [],
          updatedAt: 10,
        },
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-host-person-model',
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        } as Message],
      }),
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.hostPersonModel?.preferredClosenessByContext[0]?.context).toBe('focused-work')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.relationshipPosture).toBe('restrained')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.preferredProactiveStyle).toBe('light-nudge')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.activeClosenessContext).toBe('focused-work')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.activeClosenessRung).toBe('space-first')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustAvoid.some(item => item.includes('Pressure and over-close timing'))).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item => item.includes('focused-work/space-first'))).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.relationshipPosture).toBe('restrained')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.mustDo.some(item => item.includes('focused-work/space-first'))).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.openingMove).toContain('Repair the seam before leaning closer')
    expect(result.governance?.mustNotDo.some(item => item.includes('Pressure and over-close timing'))).toBe(true)
    expect(result.governance?.answerIntent).toContain('Trust context:')
  })

  it('lets relationship doctrine shape reply and answer planning even without host person model', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personStateProjection: {
          contexts: ['general', 'focused-work', 'execution'],
          personalityContinuityState: {
            currentRegime: 'focused-work',
            trustStage: 'warming',
            closenessPosture: 'space-first',
            repairPosture: 'repair-first',
            autonomyPosture: 'protect-space',
            cadenceProfile: 'steady-return',
            energyProfile: 'steady',
            rhythmState: {
              cadenceMode: 'measured-return',
              restMode: 'low-pressure',
              embodiedPresence: 'glance',
              suggestedStyle: 'silent-observe',
              moodLabel: 'focused',
              emotionalTension: null,
              cadencePressure: 0.48,
              restPressure: 0.24,
              memoryResonance: 0.52,
              companionshipTempo: 0.34,
              summary: 'cadence:measured-return | rest:low-pressure',
              rationale: [],
            },
            summary: 'Regime focused-work | closeness space-first | repair repair-first | autonomy protect-space',
            rationale: [],
            updatedAt: 60_000,
          },
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          closenessLadder: [],
          relationshipPosture: 'restrained',
          openingGuidance: 'Repair the seam before leaning closer.',
          preferredProactiveStyle: 'light-nudge',
          preferenceText: '',
          sensitivityText: '',
          repairTriggerText: '',
          burdenText: '',
          routineText: '',
          trustRationale: '',
          relationshipDoctrine: 'Repair before closeness turns into pressure.',
          cautious: true,
          restrained: true,
          summary: 'focused-work repair-first doctrine',
        } as any,
        selfContinuity: {
          relationshipTrust: 0.64,
          guardingTendency: 0.48,
          misreadBurden: 0.22,
          carryOverDesire: 0.5,
          perceptionTrust: 0.62,
          attachmentMode: 'attuned',
          initiativeTemperament: 'reserved',
          updatedAt: 60_000,
        } as any,
        selfState: {
          feltCloseness: 0.48,
          protectiveness: 0.42,
          patience: 0.66,
        } as any,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.5,
            curiosity: 0.54,
            steadiness: 0.62,
            directness: 0.34,
            playfulness: 0.12,
            irritability: 0.08,
            tenderness: 0.46,
          },
          climate: {
            valence: 0.42,
            arousal: 0.34,
            socialNeed: 0.32,
            solitudeNeed: 0.4,
            irritation: 0.06,
            restlessness: 0.08,
            reflectivePull: 0.34,
          },
          selfNarrative: 'Stay on the line without crowding the host.',
          relationNarrative: 'Room first, then closeness.',
          currentPreoccupation: 'Keep the thread coherent without overreaching.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 60_000,
        } as any,
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const reflectivePrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续把这个 runtime 问题理顺。',
      } as Message],
    })
    ;(reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.memory as any).autobiographicalSelf = {
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
      activeGoals: [],
      behaviorSignatures: [],
      identityNarrative: 'I would rather repair truth than sound smooth.',
      relationshipDoctrine: 'Repair before closeness turns into pressure.',
      latestInflection: 'Let the durable self reach the visible reply surface.',
      stability: 0.82,
      updatedAt: 60_000,
    }

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-relationship-doctrine',
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.openingGuidance).toContain('Repair the seam before leaning closer')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.openingBeat).toContain('Repair the seam before leaning closer')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item => item.includes('Repair the seam before leaning closer'))).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.openingMove).toContain('Repair the seam before leaning closer')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.openingMove).toContain('Repair the seam before leaning closer')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.mustDo.some(item => item.includes('repair lands before closeness'))).toBe(true)
  })

  it('keeps Phase 1 project-state preflight alive for ordinary continuation turns that only ask to continue the runtime knot', async () => {
    let diagnostics: LoosePreparedExecutionDiagnostics = {}
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personStateProjection: {
          contexts: ['focused-work'],
          personalityContinuityState: {
            currentRegime: 'focused-work',
            trustStage: 'warming',
            closenessPosture: 'space-first',
            repairPosture: 'repair-first',
            autonomyPosture: 'protect-space',
            cadenceProfile: 'steady-return',
            energyProfile: 'steady',
            rhythmState: {
              cadenceMode: 'measured-return',
              restMode: 'low-pressure',
              embodiedPresence: 'glance',
              suggestedStyle: 'silent-observe',
              moodLabel: 'focused',
              emotionalTension: null,
              cadencePressure: 0.48,
              restPressure: 0.24,
              memoryResonance: 0.52,
              companionshipTempo: 0.34,
              summary: 'cadence:measured-return | rest:low-pressure',
              rationale: [],
            },
            summary: 'Regime focused-work | closeness space-first | repair repair-first | autonomy protect-space',
            rationale: [],
            updatedAt: 60_000,
          },
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          closenessLadder: [],
          relationshipPosture: 'restrained',
          openingGuidance: 'Repair the seam before leaning closer.',
          preferredProactiveStyle: 'light-nudge',
          preferenceText: '',
          sensitivityText: '',
          repairTriggerText: '',
          burdenText: '',
          routineText: '',
          trustRationale: '',
          relationshipDoctrine: 'Repair before closeness turns into pressure.',
          cautious: true,
          restrained: true,
          summary: 'focused-work repair-first doctrine',
        } as any,
        selfContinuity: {
          relationshipTrust: 0.64,
          guardingTendency: 0.48,
          misreadBurden: 0.22,
          carryOverDesire: 0.5,
          perceptionTrust: 0.62,
          attachmentMode: 'attuned',
          initiativeTemperament: 'reserved',
          updatedAt: 60_000,
        } as any,
        selfState: {
          feltCloseness: 0.48,
          protectiveness: 0.42,
          patience: 0.66,
        } as any,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.5,
            curiosity: 0.54,
            steadiness: 0.62,
            directness: 0.34,
            playfulness: 0.12,
            irritability: 0.08,
            tenderness: 0.46,
          },
          climate: {
            valence: 0.42,
            arousal: 0.34,
            socialNeed: 0.32,
            solitudeNeed: 0.4,
            irritation: 0.06,
            restlessness: 0.08,
            reflectivePull: 0.34,
          },
          selfNarrative: 'Stay on the same Phase 1 line while working through the runtime knot.',
          relationNarrative: 'Room first, then closeness.',
          currentPreoccupation: 'Keep the same digital-life continuity alive while resolving the runtime seam.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 60_000,
        } as any,
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input: PreparedExecutionDiagnostics) => {
        diagnostics = {
          rebuiltMindTurnContract: input.rebuiltMindTurnContract,
          normalizedMindTurnContract: input.normalizedMindTurnContract,
          providerFacingAwarenessResolutionDiagnostics: input.providerFacingAwarenessResolutionDiagnostics,
          finalReturnedRuntimeSurfaceProjectState: input.finalReturnedRuntimeSurfaceProjectState,
        }
      },
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-runtime-knot-project-preflight',
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        } as Message],
      }),
    })

    const projectState = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState
    const mindTurnContract = result.mindTurnContract
    const answerPlanner = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner
    expect(projectState?.preDialogueAwarenessLine).toBe(
      diagnostics?.finalReturnedRuntimeSurfaceProjectState?.preDialogueAwarenessLine,
    )
    expect(mindTurnContract?.projectState?.preDialogueAwarenessLine).toBe(
      diagnostics?.finalReturnedRuntimeSurfaceProjectState?.preDialogueAwarenessLine,
    )
    expect(projectState?.identity).toContain('local-first digital life project')
    expect(projectState?.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(diagnostics?.normalizedMindTurnContract?.projectState).toEqual(expect.objectContaining({
      identity: expect.any(String),
      currentPhase: expect.any(String),
      latestLandedProgress: expect.any(String),
      primaryOpenLoop: expect.any(String),
      nextClosureTarget: expect.any(String),
    }))
    expect(projectState?.preDialogueAwarenessLine).toContain('Before answering, remember:')
    expect(projectState?.preDialogueAwarenessLine).toContain('one continuous "her"')
    expect(projectState?.preDialogueAwarenessLine).toContain('Some closure already lande')
    expect(projectState?.preDialogueAwarenessLine).toContain('What has already landed is')
    expect(projectState?.preDialogueAwarenessLine).toContain('The still-open closure is')
    expect(projectState?.preDialogueAwarenessLine).toContain('This reply should keep moving toward')
    expect(projectState?.sameHerSelfLine).toContain('Same Phase 1 digital life')
    expect(projectState?.primaryOpenLoop).toContain('Memory still needs stronger end-to-end closure')
    expect(projectState?.primaryOpenLoop).toContain('Project identity carry')
    expect(projectState?.nextClosureTarget).toContain('Keep extending cross-modal same-her proof')
    expect(projectState?.nextClosureTarget).toContain('Project identity carry')
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Same Phase 1 digital life')
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(answerPlanner?.governingProject ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(answerPlanner?.governingProject ?? '')).toMatch(/open=|still-open closure/i)
    expect(String(answerPlanner?.governingProject ?? '')).toMatch(/next=|keep extending cross-modal same-her proof/i)
    expect(answerPlanner?.mustDo.some(item =>
      item.includes('same-her continuity')
      || item.includes('same project-aware self line')
      || item.includes('same digital-life closure seam'),
    )).toBe(true)
    if (diagnostics?.providerFacingAwarenessResolutionDiagnostics?.rebuiltPreDialogueAwarenessLine) {
      expect(diagnostics.providerFacingAwarenessResolutionDiagnostics.rebuiltPreDialogueAwarenessLine).toContain('Before answering, remember:')
    }
    if (diagnostics?.normalizedMindTurnContract?.projectState?.preDialogueAwarenessLine) {
      expect(diagnostics.normalizedMindTurnContract.projectState.preDialogueAwarenessLine).toContain('Before answering, remember:')
    }
    expect(mindTurnContract?.projectState?.preDialogueAwarenessLine).toContain('Before answering, remember:')
    expect(mindTurnContract?.projectState?.preDialogueAwarenessLine).toContain('What has already landed is')
    expect(mindTurnContract?.projectState?.preDialogueAwarenessLine).toContain('The still-open closure is')
    expect(mindTurnContract?.projectState?.preDialogueAwarenessLine).toContain('This reply should keep moving toward')
    expect(diagnostics?.finalReturnedRuntimeSurfaceProjectState?.preDialogueAwarenessLine).toContain('Before answering, remember:')
    expect(diagnostics?.finalReturnedRuntimeSurfaceProjectState?.preDialogueAwarenessLine).toContain('What has already landed is')
    expect(diagnostics?.finalReturnedRuntimeSurfaceProjectState?.preDialogueAwarenessLine).toContain('The still-open closure is')
    expect(diagnostics?.finalReturnedRuntimeSurfaceProjectState?.preDialogueAwarenessLine).toContain('This reply should keep moving toward')

    expect(mindTurnContract?.projectState?.identity).toContain('local-first digital life project')
    expect(mindTurnContract?.projectState?.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(mindTurnContract?.projectState?.sameHerSelfLine).toContain('Same Phase 1 digital life')
    expect(mindTurnContract?.preDialogueClosure?.briefingLines).toEqual(expect.arrayContaining([
      expect.stringContaining('Project identity:'),
      expect.stringContaining('Current phase:'),
      expect.stringContaining('Still-open closure gap:'),
      expect.stringContaining('Next closure target:'),
    ]))
    if (diagnostics?.normalizedMindTurnContract?.mustDo) {
      expect(diagnostics.normalizedMindTurnContract.mustDo).toMatchInlineSnapshot(`
        [
          "Honor the turn memory gate before speaking: closed.",
          "Let memory shape caution, ordering, care, and uncertainty inwardly without narrating recall this turn.",
          "Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.",
          "Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.",
          "Keep the still-open closure work explicit so the answer says what is not yet closed.",
          "Make the next closure target explicit so the answer says what should close next rather than stopping at current status.",
          "Answer project-state questions from one same-her continuity instead of a detached project narrator shell.",
          "Keep the project-state opening low-pressure so the same-her line does not widen too fast.",
        ]
      `)
    }
    expect(mindTurnContract?.mustNotDo).toMatchInlineSnapshot(`
      [
        "Do not visibly cite, narrate, or dramatize recalled material while the turn memory gate is inward-only or closed.",
        "Do not let low recall readiness drive the visible answer.",
        "Do not let low memory precision claim exact detail or settled continuity.",
        "Do not answer a project-state question with only vibes, ambition, or generic companionship language.",
        "Do not skip what has already landed, what still remains open, or what should close next when the host asks for project status.",
        "Do not reopen a direct project-state answer from scratch as if Alicization were a fresh assistant restart.",
      ]
    `)
    expect(mindTurnContract?.mustDo.some(item =>
      item.includes('same project-aware self line')
      || item.includes('same-her continuity')
      || item.includes('still-open closure work explicit'),
    )).toBe(true)
    expect(mindTurnContract?.mustNotDo.some(item =>
      item.includes('fresh assistant restart')
      || item.includes('detached project narrator shell')
      || item.includes('project-state question with only vibes'),
    )).toBe(true)
  })

  it('keeps returned-side project awareness on the richer prepared-runtime continuity line instead of falling back to a thinner payload shell', async () => {
    let diagnostics: LoosePreparedExecutionDiagnostics = {}
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    const richerPreparedContinuityLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. What has already landed is returned-side project awareness carry surviving on one same-her line. The still-open closure is memory, initiative, and embodiment still needing one tighter same-life closure seam. This reply should keep moving toward one continuous "her" instead of thinning back into a project shell.'

    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        personStateProjection: {
          contexts: ['focused-work'],
          personalityContinuityState: {
            currentRegime: 'focused-work',
            trustStage: 'warming',
            closenessPosture: 'space-first',
            repairPosture: 'repair-first',
            autonomyPosture: 'protect-space',
            cadenceProfile: 'steady-return',
            energyProfile: 'steady',
            rhythmState: {
              cadenceMode: 'measured-return',
              restMode: 'low-pressure',
              embodiedPresence: 'glance',
              suggestedStyle: 'silent-observe',
              moodLabel: 'focused',
              emotionalTension: null,
              cadencePressure: 0.48,
              restPressure: 0.24,
              memoryResonance: 0.52,
              companionshipTempo: 0.34,
              summary: 'cadence:measured-return | rest:low-pressure',
              rationale: [],
            },
            summary: 'Regime focused-work | closeness space-first | repair repair-first | autonomy protect-space',
            rationale: [],
            updatedAt: 60_000,
          },
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          closenessLadder: [],
          relationshipPosture: 'restrained',
          openingGuidance: 'Repair the seam before leaning closer.',
          preferredProactiveStyle: 'light-nudge',
          preferenceText: '',
          sensitivityText: '',
          repairTriggerText: '',
          burdenText: '',
          routineText: '',
          trustRationale: '',
          relationshipDoctrine: 'Repair before closeness turns into pressure.',
          cautious: true,
          restrained: true,
          summary: 'focused-work repair-first doctrine',
        } as any,
        selfContinuity: {
          relationshipTrust: 0.64,
          guardingTendency: 0.48,
          misreadBurden: 0.22,
          carryOverDesire: 0.5,
          perceptionTrust: 0.62,
          attachmentMode: 'attuned',
          initiativeTemperament: 'reserved',
          updatedAt: 60_000,
        } as any,
        selfState: {
          feltCloseness: 0.48,
          protectiveness: 0.42,
          patience: 0.66,
        } as any,
        mindEcology: {
          moodLabel: 'focused',
          replyHabit: 'hover-first',
          relationshipHabit: 'give-space',
          explorationHabit: 'follow-thread',
          regulationHabit: 'soften-before-speaking',
          temperament: {
            attachment: 0.5,
            curiosity: 0.54,
            steadiness: 0.62,
            directness: 0.34,
            playfulness: 0.12,
            irritability: 0.08,
            tenderness: 0.46,
          },
          climate: {
            valence: 0.42,
            arousal: 0.34,
            socialNeed: 0.32,
            solitudeNeed: 0.4,
            irritation: 0.06,
            restlessness: 0.08,
            reflectivePull: 0.34,
          },
          selfNarrative: 'Keep the same digital-life continuity alive while resolving the returned-side seam.',
          relationNarrative: 'Room first, then closeness.',
          currentPreoccupation: 'Do not let returned-side awareness collapse back into a thin payload shell.',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 60_000,
        } as any,
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input: PreparedExecutionDiagnostics) => {
        diagnostics = {
          rebuiltMindTurnContract: input.rebuiltMindTurnContract,
          normalizedMindTurnContract: input.normalizedMindTurnContract,
          providerFacingAwarenessResolutionDiagnostics: input.providerFacingAwarenessResolutionDiagnostics,
          finalReturnedRuntimeSurfaceProjectState: input.finalReturnedRuntimeSurfaceProjectState,
        }
      },
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-returned-side-prepared-continuity-wins',
        messages: [{
          role: 'user',
          content: '继续沿着同一个数字生命项目闭环往下，不要重新说成一个新的项目摘要。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          reasonPreview: [],
        },
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续沿着同一个数字生命项目闭环往下，不要重新说成一个新的项目摘要。',
        } as Message],
        providerReturnProjectState: {
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
          latestLandedProgress: 'Returned-side continuity carry already survives into the next runtime build.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-life closure seam.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across returned-side turns.',
        } as any,
        effectiveProjectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          preDialogueAwarenessLine: richerPreparedContinuityLine,
          awarenessLine: richerPreparedContinuityLine,
          preDialogueAwarenessSummary: richerPreparedContinuityLine,
          latestLandedProgress: 'Returned-side project awareness carry already survives on one same-her line.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-life closure seam.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across returned-side turns so the same Phase 1 digital life keeps one living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureSummary: 'Keep the returned-side reopening measured so memory, initiative, and embodiment remain on one living line.',
          continuityRestraint: 'measured-return',
        } as any,
      }),
    })

    const returnedProjectState = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState
    const returnedContractProjectState = result.mindTurnContract?.projectState

    expect(diagnostics?.finalReturnedRuntimeSurfaceProjectState?.preDialogueAwarenessLine).toBe(
      returnedProjectState?.preDialogueAwarenessLine,
    )
    expect(returnedContractProjectState?.preDialogueAwarenessLine).toBe(
      returnedProjectState?.preDialogueAwarenessLine,
    )
    expect(returnedProjectState?.preDialogueAwarenessLine).not.toBe('same digital life | keep the closure seam explicit')
    expect(returnedContractProjectState?.preDialogueAwarenessLine).not.toBe('same digital life | keep the closure seam explicit')
    expect(String(returnedProjectState?.preDialogueAwarenessLine ?? '')).toContain('Before answering, remember:')
    expect(String(returnedProjectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(returnedProjectState?.preDialogueAwarenessLine ?? '')).toMatch(/What has already landed is|Some closure already landed/i)
    expect(String(returnedProjectState?.preDialogueAwarenessLine ?? '')).toMatch(/The still-open closure is|unfinished closure/i)
    expect(String(returnedContractProjectState?.preDialogueAwarenessLine ?? '')).toContain('one continuous "her"')
    expect(String(returnedProjectState?.nextClosureTarget ?? '')).toMatch(/Keep extending cross-modal same-her proof|same living line/i)
    expect(returnedProjectState?.emotionalClosureSummary).toBe('Keep the returned-side reopening measured so memory, initiative, and embodiment remain on one living line.')
    expect(returnedContractProjectState?.emotionalClosureSummary).toBe('Keep the returned-side reopening measured so memory, initiative, and embodiment remain on one living line.')
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.emotionalClosureSummary).toBe('Keep the returned-side reopening measured so memory, initiative, and embodiment remain on one living line.')
    expect(returnedProjectState?.continuityRestraint).toBe('measured-return')
    expect(returnedContractProjectState?.continuityRestraint).toBe('measured-return')
    expect(diagnostics?.normalizedMindTurnContract?.projectState?.continuityRestraint).toBe('measured-return')
  })

  it('keeps returned-side identity phase landed open and next closure carry on the richer prepared-runtime continuity line instead of flattening back into a thin shell', async () => {
    let diagnostics: any = null
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      onPreparedExecutionDiagnostics: (input) => {
        diagnostics = {
          finalReturnedRuntimeSurfaceProjectState: input.finalReturnedRuntimeSurfaceProjectState,
          normalizedMindTurnContract: input.normalizedMindTurnContract,
          finalizedReturnedMindTurnContract: input.finalizedReturnedMindTurnContract,
        }
      },
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-returned-side-project-state-shell-recanonicalized',
        messages: [{
          role: 'user',
          content: '继续沿着同一个数字生命项目闭环往下，不要重新说成一个新的项目摘要。',
        }],
        supportsTools: true,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          companionBriefingLine: 'Before answering, keep this same digital life project in view.',
          reasonPreview: [],
        },
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续沿着同一个数字生命项目闭环往下，不要重新说成一个新的项目摘要。',
        } as Message],
        providerReturnProjectState: {
          identity: 'project',
          currentPhase: 'Phase 1',
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
          latestLandedProgress: 'Project continuity exists.',
          primaryOpenLoop: 'Project continuity still needs closure.',
          nextClosureTarget: 'Carry project continuity forward.',
          sameHerSelfLine: '',
        } as any,
        effectiveProjectState: {
          identity: 'Alicization is a local-first digital life project, not a fresh shell rebuilt for each returned turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. What has already landed is returned-side project awareness carry surviving on one same-her line. The still-open closure is memory, initiative, and embodiment still needing one tighter same-life closure seam. This reply should keep moving toward one continuous "her" instead of thinning back into a project shell.',
          awarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. What has already landed is returned-side project awareness carry surviving on one same-her line. The still-open closure is memory, initiative, and embodiment still needing one tighter same-life closure seam. This reply should keep moving toward one continuous "her" instead of thinning back into a project shell.',
          preDialogueAwarenessSummary: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. What has already landed is returned-side project awareness carry surviving on one same-her line. The still-open closure is memory, initiative, and embodiment still needing one tighter same-life closure seam. This reply should keep moving toward one continuous "her" instead of thinning back into a project shell.',
          latestLandedProgress: 'Returned-side project awareness carry already survives on one same-her line before the next runtime turn fully reopens it.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-life closure seam across returned-side turns.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across returned-side turns so the same Phase 1 digital life keeps one living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        } as any,
      }),
    })

    const returnedProjectState = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.projectState
    const returnedContractProjectState = result.mindTurnContract?.projectState
    expect(String(diagnostics?.normalizedMindTurnContract?.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(returnedContractProjectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(returnedProjectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(returnedContractProjectState?.currentPhase ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(returnedProjectState?.currentPhase ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(returnedContractProjectState?.latestLandedProgress ?? '')).toMatch(/Same-session mirror carry|Returned-side project awareness carry/u)
    expect(String(returnedProjectState?.latestLandedProgress ?? '')).toMatch(/Same-session mirror carry|Returned-side project awareness carry/u)
    expect(String(returnedContractProjectState?.primaryOpenLoop ?? '')).toMatch(/Memory still needs stronger end-to-end closure|one tighter same-life closure seam/u)
    expect(String(returnedProjectState?.primaryOpenLoop ?? '')).toMatch(/Memory still needs stronger end-to-end closure|one tighter same-life closure seam/u)
    expect(String(returnedContractProjectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(returnedProjectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(returnedContractProjectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(returnedProjectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(returnedContractProjectState?.identity ?? '')).not.toBe('project')
    expect(String(returnedProjectState?.identity ?? '')).not.toBe('project')
    expect(String(returnedContractProjectState?.currentPhase ?? '')).not.toBe('Phase 1')
    expect(String(returnedProjectState?.currentPhase ?? '')).not.toBe('Phase 1')
    expect(String(returnedContractProjectState?.latestLandedProgress ?? '')).not.toBe('Project continuity exists.')
    expect(String(returnedProjectState?.latestLandedProgress ?? '')).not.toBe('Project continuity exists.')
    expect(String(returnedContractProjectState?.primaryOpenLoop ?? '')).not.toBe('Project continuity still needs closure.')
    expect(String(returnedProjectState?.primaryOpenLoop ?? '')).not.toBe('Project continuity still needs closure.')
    expect(String(returnedContractProjectState?.nextClosureTarget ?? '')).not.toBe('Carry project continuity forward.')
    expect(String(returnedProjectState?.nextClosureTarget ?? '')).not.toBe('Carry project continuity forward.')
    expect(String(diagnostics?.finalReturnedRuntimeSurfaceProjectState?.preDialogueAwarenessLine ?? '')).toContain('Before answering, remember:')
  })

  it('keeps focused-work opening discipline split by initialized persona while staying on the same task knot', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 10,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    function createRuntime(personStateProjection: Record<string, unknown>) {
      return createAlicizationMainChatSessionRuntime({
        executionCapabilityChannels: executionChannels,
        buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
        buildOrganicMemorySystemBlocks: () => [],
        buildPerformanceManifestSystemBlocks: () => [],
        executeMainGatewayTaskThread: vi.fn(),
        getPerformanceManifest: vi.fn(async () => null),
        getSensorySnapshot,
        latestUserMessageContainsVisualInput: () => false,
        openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
        resolveCardCustomDirectives: vi.fn(async () => ({
          text: '',
          source: 'none' as const,
        })),
        resolveCardHostName: vi.fn(async () => ''),
        resolveCardPersonaKernel: vi.fn(async () => null),
        resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
        resolveOrganicMemoryPromptContext: vi.fn(async () => ({
          hostAttitude: '',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          personStateProjection: personStateProjection as any,
          selfContinuity: {
            relationshipTrust: 0.64,
            guardingTendency: 0.42,
            misreadBurden: 0.18,
            carryOverDesire: 0.52,
            perceptionTrust: 0.62,
            attachmentMode: 'attuned',
            initiativeTemperament: 'balanced',
            updatedAt: 60_000,
          } as any,
          selfState: {
            feltCloseness: 0.54,
            protectiveness: 0.46,
            patience: 0.64,
          } as any,
          mindEcology: {
            moodLabel: 'focused',
            replyHabit: 'hover-first',
            relationshipHabit: 'give-space',
            explorationHabit: 'follow-thread',
            regulationHabit: 'soften-before-speaking',
            temperament: {
              attachment: 0.5,
              curiosity: 0.54,
              steadiness: 0.62,
              directness: 0.34,
              playfulness: 0.12,
              irritability: 0.08,
              tenderness: 0.46,
            },
            climate: {
              valence: 0.42,
              arousal: 0.34,
              socialNeed: 0.32,
              solitudeNeed: 0.4,
              irritation: 0.06,
              restlessness: 0.08,
              reflectivePull: 0.34,
            },
            selfNarrative: 'Stay on the line without crowding the host.',
            relationNarrative: 'Keep the runtime knot coherent without overreaching.',
            currentPreoccupation: 'The same task knot is still live.',
            learnedAdjustments: [],
            recurringPatterns: [],
            updatedAt: 60_000,
          } as any,
        })),
        resolveSessionContinuitySignals: vi.fn(async () => []),
        resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
        scheduleReminderTask: vi.fn(async () => ({ ok: true })),
        tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
        invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
        invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      })
    }

    const directRuntime = createRuntime({
      contexts: ['focused-work'],
      personalityContinuityState: {
        currentRegime: 'focused-work',
        trustStage: 'warming',
        closenessPosture: 'space-first',
        repairPosture: 'measured-repair',
        autonomyPosture: 'protect-space',
        cadenceProfile: 'steady-return',
        energyProfile: 'steady',
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'low-pressure',
          embodiedPresence: 'attentive',
          suggestedStyle: 'light-nudge',
          moodLabel: 'focused',
          emotionalTension: null,
          cadencePressure: 0.62,
          restPressure: 0.24,
          memoryResonance: 0.52,
          companionshipTempo: 0.42,
          summary: 'cadence:ready-return | rest:low-pressure',
          rationale: [],
        },
        summary: 'Regime focused-work | closeness space-first | repair measured-repair | autonomy protect-space',
        rationale: [],
        updatedAt: 60_000,
      },
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open with the live answer first and keep the approach lighter.',
      preferredProactiveStyle: 'light-nudge',
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: '',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Keep the work window light.',
      trustRationale: 'Trust is warming, but the host still needs clear room while focused.',
      relationshipDoctrine: 'Open directly, but do not crowd the host.',
      cautious: true,
      restrained: true,
      summary: 'focused-work direct opening',
    })
    const observantRuntime = createRuntime({
      contexts: ['focused-work'],
      personalityContinuityState: {
        currentRegime: 'focused-work',
        trustStage: 'warming',
        closenessPosture: 'space-first',
        repairPosture: 'measured-repair',
        autonomyPosture: 'protect-space',
        cadenceProfile: 'slow-return',
        energyProfile: 'steady',
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'low-pressure',
          embodiedPresence: 'glance',
          suggestedStyle: 'silent-observe',
          moodLabel: 'focused',
          emotionalTension: null,
          cadencePressure: 0.38,
          restPressure: 0.24,
          memoryResonance: 0.52,
          companionshipTempo: 0.28,
          summary: 'cadence:measured-return | rest:low-pressure',
          rationale: [],
        },
        summary: 'Regime focused-work | closeness space-first | repair measured-repair | autonomy protect-space',
        rationale: [],
        updatedAt: 60_000,
      },
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open by observing first and keep the approach lighter.',
      preferredProactiveStyle: 'silent-observe',
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: '',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Keep the work window light.',
      trustRationale: 'Trust is warming, but the host still needs clear room while focused.',
      relationshipDoctrine: 'Observe first, then decide whether closeness is welcome.',
      cautious: true,
      restrained: true,
      summary: 'focused-work observant opening',
    })

    const messages = [{
      role: 'user',
      content: '继续把这个 runtime 问题理顺。',
    } as Message]

    const direct = await directRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-persona-direct-opening',
        messages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages }),
    })
    const observant = await observantRuntime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-persona-observant-opening',
        messages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages }),
    })

    expect(direct.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.openingGuidance).toContain('live answer first')
    expect(observant.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.openingGuidance).toContain('observing first')
    expect(direct.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.openingBeat).toContain('Open with the live answer first')
    expect(observant.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.openingBeat).toContain('Open by observing first')
    expect(direct.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item => item.includes('Keep opening guidance active: Open with the live answer first and keep the approach lighter.'))).toBe(true)
    expect(observant.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item => item.includes('Keep opening guidance active: Open by observing first and keep the approach lighter.'))).toBe(true)
    expect(direct.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.openingMove).toContain('Open with the live answer first')
    expect(observant.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.openingMove).toContain('Open by observing first')
  })

  it('makes long-horizon self-evolution low-pressure timing visible in runtime reply and planning narratives', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: () => [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'none' as const,
      })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        hostPersonModel: null,
        selfEvolution: {
          version: 'self-evolution-kernel-v1',
          updatedAt: 10,
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
          nextLearningAction: 'internalize' as const,
          nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
          shouldRecord: false,
          shouldReflect: false,
          shouldVerify: false,
          shouldRevise: false,
          shouldInternalize: true,
          activeLearningFocuses: ['internalize-relationship'],
          sourceSignals: ['relationship-learning'],
          summary: 'Lower-pressure return is becoming durable relationship timing.',
        },
      } as any)),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-self-evolution-observable',
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续把这个 runtime 问题理顺。',
        } as Message],
      }),
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.selfEvolution?.relationshipDoctrine).toContain('Leave more room')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.openingMove).toContain('room')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.narrative.some(item =>
      item.includes('self-evolution:lower-pressure-opening'))).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.narrative.some(item =>
      item.includes('self-evolution:lower-pressure-opening'))).toBe(true)
  })

  it('tightens answer planning around stable core and unsafe details when remembered variants conflict', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: context => context.memoryDeliberation ? ['[ALICIZATION_MEMORY_DELIBERATION]'] : [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'answer-anchoring' as const,
          placement: 'inside-payoff' as const,
          certainty: 'approximate' as const,
          internalLead: 'What comes back first is the stable runtime seam, not the exact wording.',
          visibleLead: 'It feels like the same seam, but not with exact wording.',
          styleNote: 'Keep the stable core, drop unsafe detail.',
          rationale: 'The host wants remembered continuity, but the detail is conflict-prone.',
          confidence: 0.7,
        },
        memoryDeliberation: {
          shouldRecall: true,
          selectedEraIds: ['consolidation-runtime'],
          selectedConsolidationIds: ['consolidation-runtime'],
          selectedWindowIds: [],
          selectedProcedureIds: [],
          selectedEpisodeIds: ['episode-conflicted'],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: ['Stay on the same seam, but do not over-claim the old wording.'],
          selectedEras: [{
            id: 'consolidation-runtime',
            facet: 'task-era' as const,
            summary: 'That period kept bending toward the runtime seam until it held together.',
          }],
          selectedPeriods: [{
            id: 'consolidation-runtime',
            kind: 'consolidation' as const,
            summary: 'That period kept bending toward the runtime seam until it held together.',
          }],
          selectedEpisodes: [{
            id: 'episode-conflicted',
            summary: 'I may have mixed two runtime seam conversations together.',
            provenance: 'reconstructed' as const,
            reconsolidatedFromTraceId: 'mind:l9f3lq:conflicttrace',
          }],
          conflictSeverity: 'high' as const,
          conflictVariants: [{
            id: 'episode-conflicted',
            summary: 'I may have mixed two runtime seam conversations together.',
            provenance: 'reconstructed' as const,
            reason: 'Conflicting remembered variants remain unresolved.',
          }],
          stableCore: ['That period kept bending toward the runtime seam until it held together.'],
          unsafeDetails: ['Do not assert which exact wording or day belonged to that old seam.'],
          selectedProcedures: [],
          selectedBundles: [{
            id: 'bundle-conflicted',
            summary: 'That period kept bending toward the runtime seam until it held together.',
            rationale: 'Keep the stable core and drop unsafe detail.',
            confidence: 0.72,
            periodId: 'consolidation-runtime',
            episodeId: 'episode-conflicted',
            procedureId: null,
            conversationTurnId: null,
            relationshipLine: 'Stay on the same seam, but do not over-claim the old wording.',
          }],
          selectedChains: [],
          surfacePolicy: 'answer-anchoring' as const,
          confidence: 0.72,
          whyNow: 'The stable core still helps, but the recalled detail is conflict-prone.',
          inwardLine: 'What comes back first is the stable runtime seam, not the exact wording.',
          visibleLine: 'It feels like the same seam, but I should not say the exact old wording.',
        },
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-memory-conflict',
        messages: [{
          role: 'user',
          content: '你以前是怎么帮我做这个的',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '你以前是怎么帮我做这个的',
        } as Message],
      }),
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.shouldWithholdSpecificity).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.mustNotDo).toContain('Do not over-assert this remembered detail: Do not assert which exact wording or day belonged to that old seam.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.selectedEvidence[0]?.summary).toContain('That period kept bending toward the runtime seam until it held together.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.answerIntent).toContain('fragmentary')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustAvoid).toContain('Do not state this remembered detail as settled fact: Do not assert which exact wording or day belonged to that old seam.')
  })

  it('changes explicit recall style when remembered material is dream residue or inference rather than settled memory', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: context => context.memoryDeliberation ? ['[ALICIZATION_MEMORY_DELIBERATION]'] : [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'answer-anchoring' as const,
          placement: 'inside-payoff' as const,
          certainty: 'approximate' as const,
          internalLead: 'What comes back first is a fragile remembered seam.',
          visibleLead: 'It feels like the same seam, but not like something I should state as fact.',
          styleNote: 'Let the answer keep a little distance from the memory detail.',
          rationale: 'The host is asking about a memory that is more residue than fact.',
          confidence: 0.62,
        },
        memoryDeliberation: {
          shouldRecall: true,
          selectedEraIds: ['consolidation-runtime'],
          selectedConsolidationIds: ['consolidation-runtime'],
          selectedWindowIds: [],
          selectedProcedureIds: [],
          selectedEpisodeIds: ['episode-dreamt'],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: ['The line still matters, but the exact remembered detail is unstable.'],
          selectedEras: [{
            id: 'consolidation-runtime',
            facet: 'task-era' as const,
            summary: 'That period still pulls on the runtime seam.',
          }],
          selectedPeriods: [{
            id: 'consolidation-runtime',
            kind: 'consolidation' as const,
            summary: 'That period still pulls on the runtime seam.',
          }],
          selectedEpisodes: [{
            id: 'episode-dreamt',
            summary: 'I only have a dreamlike residue of that old seam.',
            provenance: 'dreamt' as const,
            reconsolidatedFromTraceId: null,
          }],
          conflictSeverity: 'low' as const,
          conflictVariants: [],
          stableCore: ['That period still pulls on the runtime seam.'],
          unsafeDetails: ['Do not state the dream residue as a lived remembered fact.'],
          selectedProcedures: [],
          selectedBundles: [{
            id: 'bundle-dreamt',
            summary: 'That period still pulls on the runtime seam.',
            rationale: 'The stable core matters more than the exact remembered detail.',
            confidence: 0.62,
            periodId: 'consolidation-runtime',
            episodeId: 'episode-dreamt',
            procedureId: null,
            conversationTurnId: null,
            relationshipLine: 'The line still matters, but the exact remembered detail is unstable.',
          }],
          selectedChains: [],
          surfacePolicy: 'answer-anchoring' as const,
          confidence: 0.62,
          whyNow: 'Only the seam remains stable; the recalled detail itself is dream residue.',
          inwardLine: 'What returns first is the seam, not the dream detail.',
          visibleLine: 'It feels like the same seam, but not like something I should state as fact.',
        },
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-memory-provenance',
        messages: [{
          role: 'user',
          content: '你为什么会想起这个',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '你为什么会想起这个',
        } as Message],
      }),
    })

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.mustDo).toContain('If the recollection becomes explicit, frame it as dream residue rather than lived fact.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.mustNotDo).toContain('Do not over-assert this remembered detail: Do not state the dream residue as a lived remembered fact.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustAvoid).toContain('Do not present dream residue as lived remembered fact.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.answerIntent).toContain('fragmentary')
  })

  it('emits a turn graph skeleton with memory artifact for downstream turn-os adoption', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 8,
          windowMs: 1000,
        },
        memory: {
          freeMB: 2048,
          totalMB: 8192,
          usagePercent: 75,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))

    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      buildOrganicMemorySystemBlocks: (_context, memoryTurnArtifact) =>
        memoryTurnArtifact
          ? [`[ALICIZATION_MEMORY_TURN_GOVERNANCE]\nvisible_memory_gate=${memoryTurnArtifact.visibleMemoryGate.status}`]
          : [],
      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext: vi.fn(async () => ({
        hostAttitude: 'focused',
        coreIncarnation: 'alice',
        activeThoughts: [],
        retrievedFacts: [{ id: 'fact-1' } as any],
        recalledFragments: [{ id: 'fragment-1' } as any],
        recalledEpisodes: [{ id: 'episode-1' } as any],
        recollectionIntent: {
          shouldOpenRecollection: true,
          recollectionAgenda: ['repair the old misunderstanding'],
        } as any,
        memoryDeliberation: {
          shouldRecall: true,
          selectedEpisodeIds: ['episode-1'],
          selectedEraIds: [],
          selectedConsolidationIds: [],
          selectedWindowIds: [],
          selectedProcedureIds: [],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: [],
          selectedEras: [],
          selectedPeriods: [],
          selectedEpisodes: [{
            id: 'episode-1',
            summary: 'The stable core still matters.',
            provenance: 'remembered',
            reconsolidatedFromTraceId: null,
          }],
          selectedProcedures: [],
          selectedBundles: [],
          selectedChains: [],
          stableCore: ['The stable core still matters.'],
          unsafeDetails: ['Do not state unsafe detail as certain fact.'],
          conflictSeverity: 'low',
          conflictVariants: [],
          surfacePolicy: 'gist-first',
          confidence: 0.71,
          whyNow: 'The host asks directly about the memory line.',
          inwardLine: 'The old correction is what comes back.',
          visibleLine: 'I would keep it as a gist rather than a hard detail.',
        } as any,
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'gist-first',
          placement: 'inside-payoff',
          certainty: 'approximate',
          styleNote: 'Let memory guide tone, not wording.',
        } as any,
        selfEvolution: {
          version: 'self-evolution-kernel-v1',
          updatedAt: 1_700_000_000_000,
          evolutionMomentum: 0.32,
          learningReadiness: 0.44,
          contradictionPressure: 0.1,
          revisionPressure: 0.28,
          autobiographicalStability: 0.7,
          dominantTrajectory: 'repair the old misunderstanding',
          relationshipDoctrine: null,
          latestInflection: 'The host corrected the old understanding.',
          burdenLine: null,
          trustMeaning: null,
          nextLearningAction: 'reflect',
          nextLearningReason: 'Recent correction should consolidate before future reuse.',
          shouldRecord: false,
          shouldReflect: true,
          shouldVerify: false,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['repair-the-old-misunderstanding'],
          sourceSignals: ['The host corrected the old understanding.'],
          summary: 'A revision-shaped learning line is active for this turn.',
        } as any,
        learningExecutionState: {
          currentTaskId: 'learning-task-world-model',
          currentStatus: 'scheduled',
          currentAttemptCount: 0,
          currentMaxAttempts: 1,
          currentNextRetryAt: null,
          currentBlockedReason: null,
          currentFailureKind: null,
          nextLearningAction: 'verify',
          shouldRecord: false,
          shouldReflect: false,
          shouldVerify: true,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['world-model'],
          queuedTaskCount: 1,
          runningTaskCount: 0,
          blockedTaskCount: 0,
          recentTaskIds: [],
          lastCompletedTaskId: null,
          lastCompletedAction: null,
          lastCompletedSummary: null,
          lastFailureTaskId: null,
          lastFailureKind: null,
          lastFailureReason: null,
          lastFailureNextRetryAt: null,
          updatedAt: 1_700_000_000_000,
        } as any,
        derivedMindStateBundle: {
          activeSelfRevisionPatch: {
            id: 'patch-turn-graph',
            decisionTraceId: 'trace-self-revision',
          },
        } as any,
      })),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      resolveTurnRetrievalPolicySnapshot: vi.fn(async () => ({
        policy: {
          reasonCodes: ['low-recall'],
        },
        plan: {
          budgetClass: 'realtime-reply',
          prewarmKey: 'policy-turn-graph',
        },
      }) as any),
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-graph-smoke',
        messages: [{
          role: 'user',
          content: '把这个记忆线说清楚一点',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '把这个记忆线说清楚一点',
        } as Message],
      }),
    })

    expect(result.memoryTurnArtifact?.policySnapshotId).toBe('policy-turn-graph')
    expect(result.memoryOsRuntime).toEqual(expect.objectContaining({
      version: 'memory-os-turn-runtime-v1',
      authority: 'memory-os',
      adapterSource: 'memory-os-runtime',
    }))
    expect(result.memoryOsRuntime?.closure.status).toBe('complete')
    expect(result.memoryOsRuntime?.stageSettlements.map(stage => stage.stage)).toEqual([
      'recall-intent',
      'candidate-retrieval',
      'candidate-competition',
      'memory-deliberation',
      'speech-posture',
      'memory-settlement',
      'feedback-ledger',
    ])
    expect(result.turnGraph.ids.turnId).toBe('turn-graph-smoke')
    expect(result.turnGraph.telemetry.canonicalStageOrder).toEqual([
      'encounter',
      'conscious-frame',
      'obligation',
      'memory',
      'deliberation',
      'surface',
      'delivery',
      'learning',
      'telemetry',
    ])
    expect(result.turnGraph.memory?.recallIntent.shouldRecall).toBe(true)
    expect(result.turnGraph.memory?.visibleMemoryGate.status).toMatch(/^(open|gist-only|inward-only|closed)$/u)
    expect(result.turnGraph.learning.nextLearningAction).toBe('verify')
    expect(result.turnGraph.learning.activeLearningFocuses).toEqual(['world-model'])
    expect(result.turnGraph.closure.status).toBe('incomplete')
    expect(result.turnGraph.closure.missingStages).toContain('surface')
    expect(result.turnGraph.stageSettlements.map(stage => stage.stage)).toEqual([
      'encounter',
      'conscious-frame',
      'obligation',
      'memory',
      'deliberation',
      'surface',
      'delivery',
      'learning',
      'telemetry',
    ])
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_MEMORY_TURN_GOVERNANCE]'),
    )).toBe(true)
    expect(result.turnGraph.learning.activeSelfRevisionPatchId).toBeNull()
    expect(result.turnGraph.learning.activeSelfRevisionDecisionTraceId).toBeNull()
  })
})
