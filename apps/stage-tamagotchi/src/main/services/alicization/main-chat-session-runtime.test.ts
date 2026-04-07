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
      'organic-memory-context',
      'performance-manifest',
      'card-directives',
      'host-name',
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

    expect(result.tools?.some((entry: any) => String(entry?.function?.name) === 'sensory_capture_state')).toBe(false)
    expect(result.getSessionTrace().phaseOrder).not.toContain('tool:sensory-capture-state')
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
})
