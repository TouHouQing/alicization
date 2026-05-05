import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput } from './agent-runtime'
import type {
  AlicizationPreparedMainChatPrelude,
} from './main-chat-session-runtime'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationAgentRuntime } from './agent-runtime'
import {
  createAlicizationMainChatSessionRuntime,
} from './main-chat-session-runtime'

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
}): AlicizationPreparedMainChatPrelude {
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
  }
}

function createReflectivePrelude(overrides?: {
  messages?: Message[]
}): AlicizationPreparedMainChatPrelude {
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

describe('main chat session runtime', () => {
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
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
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
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

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
      prelude: createPrelude(),
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
      'organic-memory-context',
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

    expect(result.tools?.some((entry: any) => String(entry?.function?.name) === 'sensory_capture_state')).toBe(false)
    expect(result.getSessionTrace().phaseOrder).not.toContain('tool:sensory-capture-state')
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
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
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
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
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
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
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
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
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
      buildOrganicMemorySystemBlocks: () => [],
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
      buildMainRuntimeCorePromptBlocks: ({ hostName }) => [`[CORE:${hostName}]`],
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
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
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
      buildOrganicMemorySystemBlocks: () => [],
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
    expect(getPerformanceManifest).not.toHaveBeenCalled()
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
    expect(String(obligationBlock?.content ?? '')).toContain('Status: completed.')
    expect(String(obligationBlock?.content ?? '')).toContain('Outcome: all tests passed.')
    expect(result.governance?.openingStyle).toBe('direct-answer')
    expect(result.governance?.mustDo).toContain('Use the first sentence to pay off the freshest executor result for the current follow-up.')
    expect(result.governance?.mustNotDo).toContain('Do not imply the task re-ran in this exact turn unless new tool output appears now.')
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
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation')
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
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.cognition.mindTurnFrame?.narrative).toContain('memory-deliberation:surface:answer-anchoring')
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

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.mustInclude.some(item => item.includes('repair'))).toBe(true)
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.openingMove).toContain('Repair the seam before leaning closer')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.mustDo.some(item => item.includes('repair lands before closeness'))).toBe(true)
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
})
