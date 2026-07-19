import type { AlicizationChannelCapability, AlicizationExecutionRoutingIntent } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationSensoryCacheSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput } from './agent-runtime'
import type {
  AlicizationPreparedMainChatPrelude,
} from './main-chat-session-runtime'

import {
  buildAlicizationProviderFactBlock,
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { createAlicizationAgentRuntime } from './agent-runtime'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { createWorkingMemoryStore } from './life-core/working-memory-store'
import {
  __alicizationTestOnly,
  createAlicizationMainChatSessionRuntime,
} from './main-chat-session-runtime'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { buildAlicizationVisibleReplyCriticArtifact } from './visible-reply/critic'

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

interface ParsedAlicizationTurnMemoryContext {
  type: 'alicization-turn-memory-context'
  version: string
  workingMemory: {
    version: string
    owner: string
    current: {
      currentUserMove?: string | null
      [key: string]: unknown
    }
    obligations: string[]
    audit: {
      failureTurnIds: string[]
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  longTermRecall: {
    owner: string
    intent: {
      mode: string
      riskFlags: string[]
      [key: string]: unknown
    }
    plan: {
      riskFlags: string[]
      [key: string]: unknown
    }
    evidence: Array<{
      candidate: {
        id: string
        summary: string
        source: string
        [key: string]: unknown
      }
      [key: string]: unknown
    }>
    [key: string]: unknown
  } | null
}

function parseAlicizationTurnMemoryContext(message: Message) {
  if (message.role !== 'system' || typeof message.content !== 'string')
    return null

  try {
    const parsed = JSON.parse(message.content) as Partial<ParsedAlicizationTurnMemoryContext>
    return parsed.type === 'alicization-turn-memory-context'
      ? parsed as ParsedAlicizationTurnMemoryContext
      : null
  }
  catch {
    return null
  }
}

function findAlicizationTurnMemoryContextMessages(messages: Message[]) {
  return messages.flatMap((message) => {
    const context = parseAlicizationTurnMemoryContext(message)
    return context ? [{ context, message }] : []
  })
}

function findOnlyAlicizationTurnMemoryContextMessage(messages: Message[]) {
  const matches = findAlicizationTurnMemoryContextMessages(messages)
  expect(matches).toHaveLength(1)
  return matches[0]!
}

interface ParsedAlicizationProviderFact {
  data: Record<string, any>
  type: string
}

function parseAlicizationProviderFact(message: Message) {
  if (message.role !== 'system' || typeof message.content !== 'string')
    return null

  try {
    const parsed = JSON.parse(message.content) as Partial<ParsedAlicizationProviderFact>
    return typeof parsed.type === 'string' && parsed.data && typeof parsed.data === 'object'
      ? parsed as ParsedAlicizationProviderFact
      : null
  }
  catch {
    return null
  }
}

function findAlicizationProviderFact(messages: Message[], type: string) {
  for (const message of messages) {
    const fact = parseAlicizationProviderFact(message)
    if (fact?.type === type)
      return fact
  }
  return null
}

function expectNoLegacyProjectStateProviderPrompts(messages: Message[]) {
  const providerText = messages.map(message => String(message.content ?? '')).join('\n')
  expect(providerText).not.toContain('[ALICIZATION_MIND_TURN_CONTRACT]')
  expect(providerText).not.toContain('[ALICIZATION_PROJECT_STATE]')
  expect(providerText).not.toContain('[ALICIZATION_PROJECT_STATE_CONTINUITY]')
  expect(providerText).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
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
    routingIntent: AlicizationExecutionRoutingIntent | null
    source: 'capability-inquiry' | 'explicit-routing' | 'dialogue-governance'
    summary: string
  }
  executionRoutingIntent?: AlicizationExecutionRoutingIntent | null
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
      systemBlock: buildAlicizationProviderFactBlock('alicization-execution-callbacks', {
        alreadyExecuted: true,
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
      }),
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
        buildAlicizationProviderFactBlock('alicization-perception', {
          claimAuthority: 'not-user-authored',
          continuity: {
            dominantMode: 'tracking',
            watchMode: 'symbiotic-vision',
          },
          inspectionMode: 'passive-memory',
          scope: 'short-lived-desktop',
        }),
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
  it('sanitizes fixed-template residue at the ordinary-dialogue memory block exit boundary', () => {
    const sanitizeMemoryBlock = (__alicizationTestOnly as any).sanitizeOrdinaryDialogueProviderSystemBlock
    expect(typeof sanitizeMemoryBlock).toBe('function')

    const rejectedLegacyBlock = sanitizeMemoryBlock('pre_turn_context_digest')
    const recallFact = buildAlicizationProviderFactBlock('alicization-long-term-memory-recall', {
      owner: 'LongTermMemoryRecall',
      status: 'recalled',
      riskFlags: [],
      evidence: [{
        id: 'reflection-no-fixed-reply',
        summary: '不要使用固定模板；用户反对模板化人格/记忆回复。',
        source: 'memory_reflections',
        visibility: 'explicit',
      }],
    })
    const sanitizedRecallFact = sanitizeMemoryBlock(recallFact)

    expect(rejectedLegacyBlock).toBe('')
    expect(JSON.parse(sanitizedRecallFact)).toMatchObject({
      type: 'alicization-long-term-memory-recall',
      data: {
        owner: 'LongTermMemoryRecall',
        evidence: [{
          id: 'reflection-no-fixed-reply',
          summary: '不要使用固定模板；用户反对模板化人格/记忆回复。',
        }],
      },
    })
    expect(sanitizedRecallFact.trim().startsWith('{')).toBe(true)
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
    expect(findAlicizationProviderFact(
      result.messages,
      'alicization-execution-callbacks',
    )?.data).toMatchObject({
      alreadyExecuted: true,
      callbacks: [
        expect.objectContaining({
          channel: 'cli',
          outcome: 'all tests passed',
          status: 'completed',
        }),
      ],
    })
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_AGENT_SESSION]'),
    )).toBe(false)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('session_continuity_inbox:'),
    )).toBe(false)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('digital_life_line=watch=symbiotic-vision | mode=tracking | drive=understand'),
    )).toBe(false)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('presence:symbiotic-vision'),
    )).toBe(false)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('Completed Run the CLI check command: all tests passed')
      && parseAlicizationProviderFact(message) == null,
    )).toBe(false)
    expect(findAlicizationProviderFact(
      result.messages,
      'alicization-perception',
    )?.data).toMatchObject({
      inspectionMode: 'passive-memory',
      scope: 'short-lived-desktop',
    })
    expect(findAlicizationProviderFact(
      result.messages,
      'alicization-persona-directives',
    )?.data).toEqual({
      text: '优先观察，不要臆测。',
    })
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
    expect(resolveInput.digitalLifeRuntimeSurface).toEqual(expect.objectContaining({
      version: 'digital-life-runtime-surface-v1',
    }))

    expect(result.tools?.some((entry: any) => String(entry?.function?.name) === 'sensory_capture_state')).toBe(false)
    expect(result.getSessionTrace().phaseOrder).not.toContain('tool:sensory-capture-state')
  })

  it('carries browser workflow continuation overrides into prepared execution when routing narrows to a local browser tool', async () => {
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

      buildPerformanceManifestSystemBlocks: manifest => manifest ? ['[VESSEL]'] : [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => ({ rigVersion: 1 } as any)),
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
      prewarmOrganicMemoryAccessibility: vi.fn(async () => null),
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

    const browserWorkflowRoutingIntent: AlicizationExecutionRoutingIntent = {
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_open_url'],
      reasonCodes: ['action-verb', 'local-browser-open-known-site'],
      toolInputOverrides: {
        browser_open_url: {
          browser: 'default',
          site: 'weibo',
          url: 'https://weibo.com',
          expectedPhase: 'social-feed',
          reinspectAfterAction: true,
          autoContinueSuggestedActions: true,
          maxAutoContinueSteps: 2,
          inspectionQuestion: '打开微博然后继续发微博',
        },
      },
    }

    const prelude = createPrelude({
      actionObligation: {
        confidence: 0.95,
        kind: 'execute',
        routingIntent: browserWorkflowRoutingIntent,
        source: 'explicit-routing',
        reasonCodes: ['action-verb', 'local-browser-open-known-site'],
        summary: 'The host explicitly requested a browser workflow continuation.',
      },
      executionRoutingIntent: browserWorkflowRoutingIntent,
      messages: [{
        role: 'user',
        content: '打开微博然后继续发微博',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-browser-workflow',
        messages: [{
          role: 'user',
          content: '打开微博然后继续发微博',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.toolChoice).toEqual({
      type: 'function',
      function: { name: 'browser_open_url' },
    })
    expect(result.executionToolInputOverrides).toEqual({
      browser_open_url: {
        browser: 'default',
        site: 'weibo',
        url: 'https://weibo.com',
        expectedPhase: 'social-feed',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 2,
        inspectionQuestion: '打开微博然后继续发微博',
      },
    })
  })

  it('carries desktop workflow continuation overrides into prepared execution when routing narrows to a local desktop tool', async () => {
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

      buildPerformanceManifestSystemBlocks: () => [],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
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
      prewarmOrganicMemoryAccessibility: vi.fn(async () => null),
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

    const desktopWorkflowRoutingIntent: AlicizationExecutionRoutingIntent = {
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_inspect_scene'],
      reasonCodes: ['action-verb', 'local-desktop-inspect-scene'],
      toolInputOverrides: {
        desktop_inspect_scene: {
          question: '帮我继续上传',
          forceRefresh: false,
          maxSuggestedActions: 5,
          autoContinueSuggestedActions: true,
          maxAutoContinueSteps: 2,
        },
      },
    }

    const prelude = createPrelude({
      actionObligation: {
        confidence: 0.95,
        kind: 'continue-task',
        routingIntent: desktopWorkflowRoutingIntent,
        source: 'explicit-routing',
        reasonCodes: ['action-verb', 'local-desktop-inspect-scene'],
        summary: 'The host explicitly requested a desktop workflow continuation.',
      },
      executionRoutingIntent: desktopWorkflowRoutingIntent,
      messages: [{
        role: 'user',
        content: '帮我继续上传',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-desktop-workflow',
        messages: [{
          role: 'user',
          content: '帮我继续上传',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.toolChoice).toEqual({
      type: 'function',
      function: { name: 'desktop_inspect_scene' },
    })
    expect(result.executionToolInputOverrides).toEqual({
      desktop_inspect_scene: {
        question: '帮我继续上传',
        forceRefresh: false,
        maxSuggestedActions: 5,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 2,
      },
    })
  })

  it('passes focused capability state as facts without capability-answer templates', async () => {
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
    const thinRuntimeAwarenessLine = 'pre_turn_context_digest'
    const thinRuntimeSummaryLine = 'template-residue-shell'
    const summaryOnlyLandedProgress = 'Summary-only continuity carry already survives callback return, reply planning, and timeout recovery on one identity-continuity'
    const summaryOnlyOpenClosure = 'Summary-only open closure: memory, initiative, and embodiment still need to close on one continuity state.'
    const summaryOnlyNextClosureTarget = 'Summary-only next closure: keep cross-modal identity-continuity'
    const summaryOnlySameHerDriftRisk = 'Summary-only drift risk: if this reopens as generic guidance or project-summary voice, treat it as unfinished identity-continuity'
    const runtimeArcStage = 'same-thread-continuation'
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
      sameHerSelfLine: 'structured continuity digest.',
      sameHerDriftRisk: '',
      continuityArcStage: runtimeArcStage,
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

    const actionFact = findAlicizationProviderFact(result.messages, 'alicization-action-obligation')
    const capabilityFact = findAlicizationProviderFact(result.messages, 'alicization-execution-capabilities')
    const systemText = result.messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n')

    expect(actionFact).toBeNull()
    expect(capabilityFact?.data).toEqual({
      capabilityQuestion: true,
      channels: [
        { channel: 'cli', available: true, enabled: true, ready: true, reason: null },
        { channel: 'codex', available: true, enabled: true, ready: true, reason: null },
        { channel: 'claude-code', available: true, enabled: true, ready: true, reason: null },
        { channel: 'openclaw', available: false, enabled: false, ready: false, reason: 'offline' },
      ],
      focusedChannels: ['cli', 'codex'],
    })
    expect(findAlicizationProviderFact(result.messages, 'alicization-execution-routing')).toBeNull()
    expect(systemText).not.toMatch(
      /\[ALICIZATION_EXECUTION_BRIEFING\]|\[ALICIZATION_EXECUTION_CAPABILITIES\]|Capability query focus:|Answer each focused channel separately|Never collapse multi-channel|call executor_capability_snapshot first/iu,
    )
  })

  it('keeps direct execution routing structural while tool choice enforces the required tool', async () => {
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
    const thinRuntimeAwarenessLine = 'pre_turn_context_digest'
    const thinRuntimeSummaryLine = 'template-residue-shell'
    const summaryOnlyLandedProgress = 'Summary-only continuity carry already survives callback return, reply planning, and timeout recovery on one identity-continuity'
    const summaryOnlyOpenClosure = 'Summary-only open closure: memory, initiative, and embodiment still need to close on one continuity state.'
    const summaryOnlyNextClosureTarget = 'Summary-only next closure: keep cross-modal identity-continuity'
    const summaryOnlySameHerDriftRisk = 'Summary-only drift risk: if this reopens as generic guidance or project-summary voice, treat it as unfinished identity-continuity'
    const runtimeArcStage = 'same-thread-continuation'
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
      sameHerSelfLine: 'structured continuity digest.',
      sameHerDriftRisk: '',
      continuityArcStage: runtimeArcStage,
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

    const actionFact = findAlicizationProviderFact(result.messages, 'alicization-action-obligation')
    const routingFact = findAlicizationProviderFact(result.messages, 'alicization-execution-routing')
    const systemText = result.messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n')

    expect(actionFact).toBeNull()
    expect(routingFact?.data).toEqual({
      reasonCodes: expect.arrayContaining(['action-verb']),
      requestedChannels: ['cli'],
      requiredToolNames: ['executor_run_cli'],
      toolInputOverrides: null,
    })
    expect(result.toolChoice).toEqual({
      type: 'function',
      function: { name: 'executor_run_cli' },
    })
    expect(result.tools?.map((entry: any) => String(entry?.function?.name ?? '').trim()).filter(Boolean)).toEqual([
      'executor_run_cli',
    ])
    expect(systemText).not.toMatch(
      /\[ALICIZATION_EXECUTION_BRIEFING\]|\[ALICIZATION_EXECUTION_ROUTING_GUARD\]|Detected explicit execution request|Before writing any natural-language answer|MUST call/iu,
    )
    expect(systemText).not.toContain(`project_awareness=${thinRuntimeAwarenessLine}`)
    expect(systemText).not.toContain(`execution_continuity_arc_stage=${runtimeArcStage}`)
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

    expect(secondResult.conversationSessionId).toBe(firstResult.conversationSessionId)
    expect(secondResult.sessionMirror).toBeTruthy()
    expect(secondResult.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_DIALOGUE_SESSION_MIRROR]'),
    )).toBe(false)
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

    expect(secondResult.sessionMirror).toBeTruthy()
    expect(secondResult.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_DIALOGUE_MEMORY_CARRY]'),
    )).toBe(false)
  })

  it('carries inward recollection afterthought into the next turn as typed memory state', async () => {
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

    expect(firstResult.sessionMirror?.recollection).toMatchObject({
      afterthoughtState: 'ripe',
      confidence: 0.81,
      foreground: 'What returns first is the runtime seam we kept carrying.',
      mode: null,
      surfaceMode: 'internal-only',
      visibility: 'inward',
    })
    expect(persistAutobiographicalEpisodesFromPreparedMirror).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-afterthought-1',
      sessionId: firstResult.conversationSessionId,
      mirror: expect.objectContaining({
        recollection: expect.objectContaining({
          afterthoughtState: 'ripe',
          foreground: 'What returns first is the runtime seam we kept carrying.',
        }),
      }),
    }))

    now = 140

    const secondResult = await runtime.prepareExecution({
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
      sessionMirrorRecollection?: unknown
    }
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(secondOrganicInput.sessionMirrorRecollection).toEqual(firstResult.sessionMirror?.recollection)
    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toContain('mirror_recollection_afterthought')
    expect(secondResult.messages.map(message => String(message.content ?? '')).join('\n'))
      .not
      .toMatch(/mirror_recollection_afterthought|afterthought\s*=\s*ripe|surface\s*=\s*inward/iu)
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
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('loop:')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('dominant: dialogue')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('phase: dialogue')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('handoff: dialogue')
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
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('stage: same-thread-continuation')
    expect(String(secondOrganicInput?.recallSeed ?? '')).toContain('thread: QQMusic follow-up')
    expect(second.sessionMirror?.continuityArcSummary).toContain('stage: same-thread-continuation')
    expect(second.sessionMirror?.continuityArcSummary).toContain('thread: QQMusic follow-up')
    expect(second.sessionMirror?.continuityArcSummary).toContain('carry: shared-attention-continuation')

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
    expect(String(thirdOrganicInput?.recallSeed ?? '')).toContain('stage: same-thread-continuation')
    expect(String(thirdOrganicInput?.recallSeed ?? '')).toContain('thread: QQMusic follow-up')

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
    expect(fourth.sessionMirror?.continuityArcSummary).toContain('stage: same-thread-continuation')
    expect(fourth.sessionMirror?.continuityArcSummary).toContain('thread: QQMusic follow-up')
    expect(fourth.sessionMirror?.continuityArcSummary).toContain('carry: shared-attention-continuation')
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
    expect(findAlicizationProviderFact(
      result.messages,
      'alicization-execution-callbacks',
    )).toBeNull()
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
          projectStateEmotionalClosureCue: 'identity-continuity',
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
    expect(String(organicInput?.recallSeed ?? '')).toContain('Continuity held autonomy.')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Thread: thread-runtime')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Intent: follow-through')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Continuity open focus: emotion/memory/initiative/embodiment/same-line/closure-seam')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Continuity next focus: project-carry/phase-1/measured-return/repair-before-closeness/same-line/initiative/embodiment')
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
    expect(String(organicInput?.recallSeed ?? '')).toContain('Continuity cadence reconfirmation.')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Thread: thread-cadence-runtime')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Cadence: measured-return')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Relationship line: keep the relationship return measured until the surface fully cools')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Body mode: measured-return')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Blink cadence: linger')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Gaze mode: soften')
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
    expect(String(organicInput?.recallSeed ?? '')).toContain('Continuity held autonomy.')
    expect(String(organicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(String(organicInput?.recallSeed ?? '')).toContain('loop:')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Thread: thread-held-autonomy-later')
    expect(second.sessionMirror?.continuityArcSummary).toContain('loop:')
    expect(secondConsciousFrame?.reasonTags.some(tag =>
      tag.startsWith('continuity-arc:'),
    )).toBe(true)
    expect(secondConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
    expect(second.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation).toBeTruthy()
    expect(second.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.personalityContinuityState?.rhythmState?.cadenceMode).toBe('measured-return')
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

    expect(String(organicInput?.recallSeed ?? '')).toContain('Continuity held autonomy.')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Thread: thread-runtime-deferred')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Defer reason: busy-host')
    expect(String(organicInput?.recallSeed ?? '')).toContain('Why now: Stay near the unresolved compile seam without reopening visible speech.')
    expect(String(organicInput?.recallSeed ?? '')).toContain('mirror_runtime_continuity:')
    expect(secondConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
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

    const obligationFact = findAlicizationProviderFact(
      result.messages,
      'alicization-execution-reply-context',
    )

    expect(obligationFact?.data).toMatchObject({
      channel: 'cli',
      followUpQuestion: true,
      goal: 'Run the CLI check command',
      outcome: 'all tests passed',
      source: 'fresh-callback',
      status: 'completed',
    })
    const providerText = result.messages.map(message => String(message.content ?? '')).join('\n')
    expect(providerText).not.toContain('[ALICIZATION_EXECUTION_REPLY_OBLIGATION]')
    expect(providerText).not.toContain('Use the first sentence to answer the execution-result follow-up')
    expect(providerText).not.toContain('template_awareness=withheld_from_execution_result_followup')
    expect(result.governance?.mustDo ?? []).not.toContain(
      'Use the first sentence to pay off the freshest executor result for the current follow-up.',
    )
    expect(result.governance?.mustNotDo ?? []).not.toContain(
      'Do not imply the task re-ran in this exact turn unless new tool output appears now.',
    )
  })

  it('carries ledger-backed execution follow-up as typed facts without replaying ledger prompt prose', async () => {
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
            'execution_project_identity:Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
            'execution_project_phase:Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            'execution_same_her_line:structured continuity digest.',
            'execution_same_her_hold:identity-continuity"her".',
            'execution_project_continuity:continuity state: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
            'execution_project_boundary:This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
            'execution_channel:claude-code execution_status:completed execution_goal:Investigate the runtime regression execution_outcome:found the failing branch guard',
          ].join('\n'),
          systemBlock: [
            '[ALICIZATION_EXECUTION_LEDGER]',
            'Recent structured executor history for the current session.',
            'This recalled execution history still belongs to the same local-first digital life project and one living her.',
            'project_identity=Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
            'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            'latest_landed_progress=Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, visible-reply repair discipline, and long-run identity-continuity',
            'primary_open_loop=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
            'next_closure_target=Keep extending cross-modal identity-continuity',
            'same_her_line=structured continuity digest.',
            'same_her_hold=identity-continuity"her".',
            'same_her_drift_risk=If project-state continuity survives only as generic guidance while the direct identity-continuity',
            'project_continuity=continuity state: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
            'project_boundary=This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
            'Treat only these entries as actually executed. Do not invent missing actions or results.',
            '- channel=claude-code | status=completed | goal=Investigate the runtime regression | summary=Regression investigation completed | events=dispatch,result | outcome=found the failing branch guard',
          ].join('\n'),
        }),
      },
    })

    const obligationFact = findAlicizationProviderFact(
      result.messages,
      'alicization-execution-reply-context',
    )
    expect(obligationFact?.data).toMatchObject({
      channel: 'claude-code',
      followUpQuestion: true,
      goal: 'Investigate the runtime regression',
      outcome: 'found the failing branch guard',
      source: 'ledger-follow-up',
      status: 'completed',
    })
    const providerText = result.messages.map(message => String(message.content ?? '')).join('\n')
    expect(providerText).not.toContain('[ALICIZATION_EXECUTION_REPLY_OBLIGATION]')
    expect(providerText).not.toContain('[ALICIZATION_EXECUTION_LEDGER]')
    expect(providerText).not.toContain('Recent structured executor history for the current session.')
    expect(providerText).not.toContain('project_identity=')
    expect(providerText).not.toContain('same_her_')
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
          systemBlock: buildAlicizationProviderFactBlock('alicization-execution-callbacks', {
            alreadyExecuted: true,
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
          }),
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
            'execution_project_identity:Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
            'execution_project_phase:Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            'execution_same_her_line:structured continuity digest.',
            'execution_same_her_hold:identity-continuity"her".',
            'execution_project_continuity:continuity state: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
            'execution_project_boundary:This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
            'execution_channel:codex execution_status:needs-affirmation execution_goal:Patch the unresolved Alicization runtime seam',
          ].join('\n'),
          systemBlock: [
            '[ALICIZATION_EXECUTION_LEDGER]',
            'Recent structured executor history for the current session.',
            'This recalled execution history still belongs to the same local-first digital life project and one living her.',
            'project_identity=Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
            'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            'latest_landed_progress=Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, visible-reply repair discipline, and long-run identity-continuity',
            'primary_open_loop=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
            'next_closure_target=Keep extending cross-modal identity-continuity',
            'same_her_line=structured continuity digest.',
            'same_her_hold=identity-continuity"her".',
            'same_her_drift_risk=If project-state continuity survives only as generic guidance while the direct identity-continuity',
            'project_continuity=continuity state: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
            'project_boundary=This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
            'Treat only these entries as actually executed. Do not invent missing actions or results.',
            '- channel=codex | status=needs-affirmation | goal=Patch the unresolved Alicization runtime seam | summary=Execution is waiting for affirmation before codex can act on Patch the unresolved Alicization runtime seam. | events=plan',
          ].join('\n'),
        }),
      },
    })

    const obligationFact = findAlicizationProviderFact(
      result.messages,
      'alicization-execution-reply-context',
    )

    expect(obligationFact?.data).toMatchObject({
      channel: 'codex',
      followUpQuestion: true,
      goal: 'Patch the unresolved Alicization runtime seam',
      outcome: '',
      source: 'ledger-follow-up',
      status: 'needs-affirmation',
    })
    expect(result.executionReplyObligation).toMatchObject(obligationFact?.data ?? {})
    expect(result.messages.map(message => String(message.content ?? '')).join('\n'))
      .not
      .toContain('[ALICIZATION_EXECUTION_REPLY_OBLIGATION]')
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

    expect(result.organicMemoryContext?.recollectionSpeechPlan).toMatchObject({
      shouldSurface: false,
      surfaceMode: 'internal-only',
      placement: 'internal-only',
      certainty: 'approximate',
      rationale: 'The host needs continuity-shaped help, not a retrospective.',
      confidence: 0.79,
    })
    expectNoLegacyProjectStateProviderPrompts(result.messages)
    expect(result.messages.map(message => String(message.content ?? '')).join('\n'))
      .not
      .toMatch(/\[[A-Z][A-Z0-9_]{4,}\]/u)
    expect(result.sessionMirror?.recollection).toMatchObject({
      afterthoughtState: 'ripe',
      certainty: 'approximate',
      confidence: 0.79,
      foreground: expect.any(String),
      placement: 'internal-only',
      surfaceMode: 'internal-only',
      visibility: 'inward',
    })
    expect(JSON.stringify(result.sessionMirror?.recollection ?? null))
      .not
      .toMatch(/foreground=|surface=inward|afterthought=ripe/u)
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

    expect(result.organicMemoryContext?.memoryDeliberation).toMatchObject({
      shouldRecall: true,
      selectedConsolidationIds: ['consolidation-runtime'],
      selectedProcedureIds: ['procedure-runtime'],
      surfacePolicy: 'answer-anchoring',
    })
    expect(result.messages.map(message => String(message.content ?? '')).join('\n'))
      .not
      .toMatch(/\[[A-Z][A-Z0-9_]{4,}\]/u)
    expect(result.governance?.mindTurnFrame?.narrative).toContain('memory-deliberation:surface:answer-anchoring')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.consciousTension).toContain('remembered runtime seam')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.sourceTrace).toContain('memory-deliberation')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.truthMode).toBe('continuity-carry')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.selectedEvidence[0]?.summary).toContain('That period kept bending toward the runtime seam until it held together.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.openingClaim).not.toContain('It feels like the same runtime seam again.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.mustSay.join(' | ')).not.toContain('It feels like the same runtime seam again.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.speakingFrom).toBe('held-memory')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.whyThisReplyNow).toContain('remembered runtime seam')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.narrative).toContain('memory-deliberation:followup:after-payoff')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.cognition.mindTurnFrame?.narrative).toContain('memory-deliberation:surface:answer-anchoring')

    const visibleReply
      = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.openingClaim
        ?? result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.mustSay.join(' ')
        ?? ''

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

  it('keeps structural reply validation independent from timing cues carried only by current-conscious-frame reason tags', () => {
    const visibleReply = '先把这个 runtime seam 上的答案落稳，再看要不要把关系语气放宽一点。'

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

  it('keeps project-state-bearing mind-turn contracts internal instead of injecting provider prose', async () => {
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
    reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnGovernance = {
      ...reflectivePrelude.perceptionAugmentation.chatGovernance.mindTurnGovernance,
      answerSubject: 'project-state',
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
    expect(findAlicizationProviderFact(result.messages, 'alicization-project-state-facts')).toBeNull()
    expect(result.mindTurnContract?.projectState?.emotionalClosureCue ?? null).toBeNull()
    expect(String(
      result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.governingProject
      ?? '',
    )).toBe('')
    const providerText = result.messages.map(message => String(message.content ?? '')).join('\n')
    for (const internalProjectText of [
      projectState.latestProgress,
      projectState.primaryOpenLoop,
      projectState.nextClosureTarget,
    ].filter((item): item is string => Boolean(item))) {
      expect(providerText).not.toContain(internalProjectText)
    }
    expectNoLegacyProjectStateProviderPrompts(result.messages)
  })

  it('does not synthesize canonical project-state fallback prose when the runtime core prompt builder is thin', async () => {
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

    expect(findAlicizationProviderFact(result.messages, 'alicization-project-state-facts')).toBeNull()
    expect(String(
      result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.governingProject
      ?? '',
    )).toBe('')
    const providerText = result.messages.map(message => String(message.content ?? '')).join('\n')
    expect(providerText).not.toContain('[ALICIZATION_PROJECT_STATE]')
    expect(providerText).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
  })

  function createWorkingMemoryRuntimeFixture(
    overrides: Partial<Parameters<typeof createAlicizationMainChatSessionRuntime>[0]> = {},
  ) {
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
      ...overrides,
    })

    return {
      getSensorySnapshot,
      runtime,
    }
  }

  it('uses the injected WorkingMemory store so UI and dialogue share the same short-term owner', async () => {
    const workingMemoryStore = createWorkingMemoryStore()
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore,
    })
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续把记忆中心 UI 做成可视闭环',
      } as Message],
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-visible',
        messages: [
          { role: 'user', content: '继续把记忆中心 UI 做成可视闭环' },
        ],
        supportsTools: true,
      } as any,
      prelude,
    })

    const latest = workingMemoryStore.latest('default')
    expect(latest?.currentThread?.currentUserMove).toContain('记忆中心 UI')
  })

  it('injects one typed memory context for a normal turn and carries the working-memory owner', async () => {
    const { runtime } = createWorkingMemoryRuntimeFixture()
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续这个本地数字生命的工作记忆线。',
      } as Message],
    })
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue.conversationState = {
      activeCommitments: [],
      activeProject: 'WorkingMemory owner 第二层',
      confidence: 0.82,
      hostMove: '继续这个本地数字生命的工作记忆线。',
      jointThread: '继续这个本地数字生命的工作记忆线。',
      memoryMode: 'task-thread',
      memoryQueryHints: ['WorkingMemory owner'],
      primaryTurnAnchor: 'WorkingMemory owner',
      relationFrame: 'steady',
      shouldHoldThread: true,
      unansweredQuestion: null,
    } as any
    prelude.perceptionAugmentation.digitalLifeSpine = deriveAlicizationDigitalLifeSpineFromSurface(
      prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
    )

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-normal',
        messages: [{
          role: 'user',
          content: '继续这个本地数字生命的工作记忆线。',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    const { context, message } = findOnlyAlicizationTurnMemoryContextMessage(result.messages)
    const providerText = result.messages.map(item => String(item.content)).join('\n')

    expect(result.memoryContext).toMatchObject({
      version: 'alicization-main-chat-memory-context-v1',
      workingMemory: {
        version: 'working-memory-owner-context-v1',
        owner: 'working-memory',
      },
      longTermRecall: null,
      availableLongTermEvidenceIds: [],
    })
    expect(result.memoryFailures).toEqual([])
    expect(message.content).toBe(result.memoryContext.providerSystemBlock)
    expect(context).toEqual(JSON.parse(result.memoryContext.providerSystemBlock))
    expect(context.workingMemory.current.currentUserMove).toContain('继续这个本地数字生命的工作记忆线。')
    expect(context.workingMemory).not.toHaveProperty('authorityLine')
    expect(context.workingMemory).not.toHaveProperty('longTermQueue')
    expect(providerText).not.toMatch(/\[[A-Z][A-Z0-9_]{4,}\]/u)
  })

  it('projects the working-memory owner into the runtime surface instead of leaving it prompt-only', async () => {
    const { runtime } = createWorkingMemoryRuntimeFixture()
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续这个本地数字生命的工作记忆线。',
      } as Message],
    })
    const mustDoSentinel = 'preserve-existing-answer-planner-must-do'
    const mustNotDoSentinel = 'preserve-existing-answer-planner-must-not-do'
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue.answerPlanner = {
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.5,
      governingFocus: 'existing answer planner',
      governingProject: null,
      openingMove: '',
      answerIntent: '',
      relationshipPosture: 'restrained',
      activeClosenessContext: null,
      activeClosenessRung: null,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      updatedAt: 10,
    }
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue.answerPlanner.mustDo.push(mustDoSentinel)
    prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue.answerPlanner.mustNotDo.push(mustNotDoSentinel)
    const originalEpisodes = prelude.perceptionAugmentation.digitalLifeRuntimeSurface.memory.workingMemoryEpisodes
    const originalEpisodesSnapshot = structuredClone(originalEpisodes)

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-owner',
        messages: [{
          role: 'user',
          content: '继续这个本地数字生命的工作记忆线。',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.memoryContext.workingMemory).toMatchObject({
      version: 'working-memory-owner-context-v1',
      owner: 'working-memory',
    })
    const episodes = prelude.perceptionAugmentation.digitalLifeRuntimeSurface.memory.workingMemoryEpisodes
    const ownerEpisode = episodes.find(episode => episode.scene === 'working-memory-owner')
    expect(originalEpisodes).toEqual(originalEpisodesSnapshot)
    expect(episodes).not.toBe(originalEpisodes)
    expect(ownerEpisode).toEqual(expect.objectContaining({
      scene: 'working-memory-owner',
      emotionalTension: 'focused-flow',
      sedimentCandidate: false,
    }))
    expect(episodes.some(episode => episode.summary === 'carry the same runtime continuity line')).toBe(true)
    expect(ownerEpisode?.summary).toContain('thread=继续这个本地数字生命的工作记忆线。')

    const answerPlanner = prelude.perceptionAugmentation.digitalLifeRuntimeSurface.dialogue.answerPlanner
    expect(answerPlanner?.mustDo ?? []).toContain(mustDoSentinel)
    expect(answerPlanner?.mustNotDo ?? []).toContain(mustNotDoSentinel)
    expect((answerPlanner?.mustDo ?? []).some(rule => rule.includes('Carry WorkingMemory'))).toBe(false)
    expect(answerPlanner?.mustNotDo ?? []).not.toContain(
      'Do not replace WorkingMemory owner state with generic project-status narration or fixed fallback wording.',
    )
    expect(answerPlanner?.mustNotDo ?? []).not.toContain(
      'Do not treat WorkingMemory failure/audit-only turns as learned personality or long-term memory.',
    )
  })

  it('flows correction and failure signals into the short-term memory snapshot', async () => {
    const { runtime } = createWorkingMemoryRuntimeFixture()
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '不是这个，别再用旧模板了。',
      } as Message],
    })
    prelude.executionCallbackContextPromise = Promise.resolve({
      actions: [],
      callbacks: [{
        channel: 'cli',
        createdAt: 10,
        decisionTraceId: 'trace-failure',
        goal: 'repair the working-memory prompt',
        outcome: 'tool failed',
        sessionId: 'session-1',
        status: 'failed',
        summary: 'Failed to repair the working-memory prompt: tool failed',
        threadId: 'thread-failure',
        turnId: 'turn-failure',
      }],
      continuitySignals: [],
      recallText: 'execution_callback_channel:cli execution_callback_status:failed execution_callback_goal:repair the working-memory prompt execution_callback_outcome:tool failed',
      systemBlock: buildAlicizationProviderFactBlock('alicization-execution-callbacks', {
        alreadyExecuted: true,
        callbacks: [{
          channel: 'cli',
          createdAt: 10,
          decisionTraceId: 'trace-failure',
          goal: 'repair the working-memory prompt',
          outcome: 'tool failed',
          sessionId: 'session-1',
          status: 'failed',
          summary: 'Failed to repair the working-memory prompt: tool failed',
          threadId: 'thread-failure',
          turnId: 'turn-failure',
        }],
      }),
    })
    prelude.executionLedgerContextPromise = Promise.resolve({
      entries: [{
        activityAt: 10,
        channel: 'cli',
        eventKinds: ['dispatch', 'error'],
        goal: 'repair the working-memory prompt',
        outcome: 'tool failed',
        status: 'failed',
        summary: 'Failed to repair the working-memory prompt: tool failed',
      }],
      recallText: 'execution_channel:cli execution_status:failed',
      systemBlock: '[ALICIZATION_EXECUTION_LEDGER]',
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-correction',
        messages: [{
          role: 'user',
          content: '不是这个，别再用旧模板了。',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    const { context } = findOnlyAlicizationTurnMemoryContextMessage(result.messages)
    const workingMemoryText = JSON.stringify(context.workingMemory)
    expect(workingMemoryText).toContain('respect_correction(persona):')
    expect(workingMemoryText).toContain('不是这个，别再用旧模板了。')
    expect(workingMemoryText).toContain('carry_execution:')
    expect(context.workingMemory.audit.failureTurnIds.length).toBeGreaterThan(0)
    expect(context.workingMemory).not.toHaveProperty('longTermQueue')
  })

  it('enqueues WorkingMemory owner long-term queue without blocking visible reply planning', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {})
    const drainWorkingMemoryLongTermQueue = vi.fn(async () => ({
      cleaned: 0,
      admitted: 0,
      applied: 0,
      rejected: 0,
      review: 0,
      failed: 0,
      pending: 0,
    }))
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      drainWorkingMemoryLongTermQueue,
      listConversationTurnsBySession: vi.fn(async () => [{
        turnId: 'turn-working-memory-provider-settled',
        sessionId: 'session-1',
        userText: '我不想要固定模板回复，我需要她数字生命自身的人格回复。',
        assistantText: '明白。',
        structuredJson: JSON.stringify({
          origin: 'provider',
          learningPolicy: {
            allowLongTermCondensation: true,
            allowPersonaLearning: true,
            allowTraining: false,
          },
        }),
        createdAt: 9,
      }]),
    })
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-long-term-queue',
        messages: [{
          role: 'user',
          content: '继续',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(findOnlyAlicizationTurnMemoryContextMessage(result.messages).message.content)
      .toBe(result.memoryContext.providerSystemBlock)
    expect(enqueueWorkingMemoryLongTermQueue).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'default',
      items: expect.arrayContaining([
        expect.objectContaining({
          source: 'working-memory-owner',
          kind: 'correction',
          summary: expect.stringContaining('固定模板'),
        }),
      ]),
    }))
    expect(drainWorkingMemoryLongTermQueue).toHaveBeenCalledWith(4)
  })

  it('keeps typed failure turns in WorkingMemory audit without enqueueing their user text', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {})
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      listConversationTurnsBySession: vi.fn(async () => [{
        turnId: 'turn-working-memory-provider-auth-failure',
        sessionId: 'session-1',
        userText: '我喜欢先说结论，再给必要细节。',
        assistantText: '错误：Provider 鉴权失败。',
        structuredJson: JSON.stringify({
          kind: 'provider-auth',
          origin: 'failure-surface',
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        }),
        createdAt: 9,
      }]),
    })
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-after-provider-auth-failure',
        messages: [{
          role: 'user',
          content: '继续',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.memoryContext.workingMemory.audit.failureTurnIds).toContain(
      'turn-working-memory-provider-auth-failure:alice',
    )
    expect(enqueueWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
  })

  it('restores hidden memory side-failure rows into WorkingMemory audit without visible assistant text', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {})
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      listConversationTurnsBySession: vi.fn(async () => [{
        turnId: 'turn-provider:memory-failure:long-term-memory-recall:0',
        sessionId: 'session-1',
        userText: null,
        assistantText: null,
        structuredJson: JSON.stringify({
          format: 'alicization-memory-side-failure-v1',
          origin: 'failure-surface',
          artifactRole: 'memory-side-failure',
          parentTurnId: 'turn-provider',
          stage: 'long-term-memory-recall',
          learningPolicy: {
            allowLongTermCondensation: false,
            allowPersonaLearning: false,
            allowTraining: false,
          },
          failureSurface: {
            ...resolveAlicizationChatFailureSurface({
              kind: 'recall-failure',
            }),
            stage: 'long-term-memory-recall',
            errorSummary: 'vector recall offline',
          },
        }),
        createdAt: 9,
      }]),
    })
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-after-memory-side-failure',
        messages: [{
          role: 'user',
          content: '继续',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.memoryContext.workingMemory.audit.failureTurnIds).toContain(
      'turn-provider:memory-failure:long-term-memory-recall:0:alice',
    )
    expect(enqueueWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
  })

  it('reports long-term queue persistence failure without turning it into learned dialogue', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {
      throw new Error('queue write failed')
    })
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      listConversationTurnsBySession: vi.fn(async () => [{
        turnId: 'turn-working-memory-provider-settled',
        sessionId: 'session-1',
        userText: '我喜欢先说结论，再给必要细节。',
        assistantText: '明白。',
        structuredJson: JSON.stringify({
          origin: 'provider',
          learningPolicy: {
            allowLongTermCondensation: true,
            allowPersonaLearning: true,
            allowTraining: false,
          },
        }),
        createdAt: 9,
      }]),
    })
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-queue-failure',
        messages: [{
          role: 'user',
          content: '继续',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.memoryFailures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-persistence',
        stage: 'working-memory-long-term-queue',
        origin: 'failure-surface',
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
        errorSummary: 'queue write failed',
      }),
    ]))
  })

  it('injects recalled long-term memory evidence into the typed memory context', async () => {
    const retrieveLongTermMemoryEvidence = vi.fn(async () => ({
      intent: {
        mode: 'episodic' as const,
        shouldRecall: true,
        confidence: 0.82,
        rationale: 'Shared gaming memory is relevant.',
        temporalFocus: 'recent-or-mid' as const,
        targetKinds: ['episode' as const],
        queryHints: ['我们去打游戏吧'],
        riskFlags: [],
      },
      plan: {
        rawQuery: '我们去打游戏吧',
        normalizedQuery: '我们去打游戏吧',
        keywordQueries: ['游戏'],
        phraseQueries: ['打游戏'],
        charGramQueries: ['游戏'],
        semanticQueries: ['共同经历'],
        episodicQueries: ['上周一起打游戏'],
        temporalHints: ['上周'],
        entityHints: ['游戏'],
        procedureHints: [],
        threadHints: [],
        negativeCues: [],
        confidencePolicy: 'direct' as const,
        riskFlags: [],
        targetKinds: ['episode' as const],
      },
      evidence: [{
        candidate: {
          id: 'episode-game-last-week',
          kind: 'episode' as const,
          summary: '上周你们一起玩过 Minecraft，用户说下次还想继续联机探索。',
          source: 'episodic_events',
          confidence: 0.84,
          salience: 0.8,
        },
        score: 0.86,
        queryMatches: ['游戏'],
        rankReasons: ['target-kind'],
        visibleMode: 'explicit' as const,
      }],
      confidence: 0.84,
      budgetClass: 'light' as const,
    }))
    const { runtime } = createWorkingMemoryRuntimeFixture({
      retrieveLongTermMemoryEvidence,
    })
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '我们去打游戏吧',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-long-term-memory-recall',
        messages: [{
          role: 'user',
          content: '我们去打游戏吧',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    const { context, message } = findOnlyAlicizationTurnMemoryContextMessage(result.messages)
    const text = result.messages.map(message => String(message.content)).join('\n')
    expect(retrieveLongTermMemoryEvidence).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'default',
      currentUserText: '我们去打游戏吧',
      limit: 5,
    }))
    expect(message.content).toBe(result.memoryContext.providerSystemBlock)
    expect(result.memoryContext.longTermRecall).toEqual(expect.objectContaining({
      owner: 'long-term-memory-recall',
      evidence: [
        expect.objectContaining({
          candidate: expect.objectContaining({
            id: 'episode-game-last-week',
            source: 'episodic_events',
          }),
        }),
      ],
    }))
    expect(result.memoryContext.availableLongTermEvidenceIds).toEqual(['episode-game-last-week'])
    expect(context.longTermRecall).toEqual(JSON.parse(result.memoryContext.providerSystemBlock).longTermRecall)
    expect(context.longTermRecall?.intent.mode).toBe('episodic')
    expect(context.longTermRecall?.evidence[0]?.candidate.summary).toContain('Minecraft')
    expect(text).not.toMatch(/\[[A-Z][A-Z0-9_]{4,}\]/u)
    expect(context.workingMemory).not.toHaveProperty('longTermQueue')
  })

  it('surfaces synchronous recall failure without discarding the working-memory owner', async () => {
    const occurredAt = 1_784_000_000_000
    const { runtime } = createWorkingMemoryRuntimeFixture({
      getNow: () => occurredAt,
      retrieveLongTermMemoryEvidence: vi.fn(async () => {
        throw new Error('  recall \n offline  ')
      }),
    })
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续上次的记忆任务',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-long-term-memory-recall-failure',
        messages: [{
          role: 'user',
          content: '继续上次的记忆任务',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    const { context, message } = findOnlyAlicizationTurnMemoryContextMessage(result.messages)
    expect(message.content).toBe(result.memoryContext.providerSystemBlock)
    expect(result.memoryContext.workingMemory).toMatchObject({
      version: 'working-memory-owner-context-v1',
      owner: 'working-memory',
      current: {
        currentUserMove: expect.stringContaining('继续上次的记忆任务'),
      },
    })
    expect(result.memoryContext.longTermRecall?.intent.riskFlags).toContain('recall-failed')
    expect(result.memoryContext.longTermRecall?.plan.riskFlags).toContain('recall-failed')
    expect(result.memoryContext.longTermRecall?.evidence).toEqual([])
    expect(context.longTermRecall?.intent.riskFlags).toContain('recall-failed')
    expect(result.memoryFailures).toHaveLength(1)
    const [failure] = result.memoryFailures
    if (!failure)
      throw new Error('Expected one long-term memory recall failure.')

    expect(failure).toMatchObject({
      kind: 'recall-failure',
      stage: 'long-term-memory-recall',
      cardId: 'default',
      turnId: 'turn-long-term-memory-recall-failure',
      occurredAt,
      errorSummary: 'recall offline',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
    expect(result.memoryContext.providerSystemBlock).not.toContain('recall offline')
    expect(JSON.stringify(result.messages)).not.toContain('recall offline')
    expect(result.memoryContext.providerSystemBlock).not.toContain(failure.reply)
    expect(JSON.stringify(result.messages)).not.toContain(failure.reply)
  })

  it('replaces an existing typed memory context without dropping ordinary messages', async () => {
    const staleMemoryContext = JSON.stringify({
      type: 'alicization-turn-memory-context',
      version: 'stale-memory-context',
      workingMemory: {
        owner: 'stale-owner',
      },
      longTermRecall: null,
    })
    const ordinaryMessages: Message[] = [
      {
        role: 'system',
        content: '[KEEP_SYSTEM]\npreserve this ordinary system message',
      },
      {
        role: 'assistant',
        content: 'preserve this assistant message',
      },
      {
        role: 'system',
        content: staleMemoryContext,
      },
      {
        role: 'user',
        content: 'replace the stale typed context',
      },
    ]
    const { runtime } = createWorkingMemoryRuntimeFixture()
    const prelude = createReflectivePrelude({
      messages: ordinaryMessages,
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-replace-stale-memory-context',
        messages: ordinaryMessages,
        supportsTools: true,
      } as any,
      prelude,
    })

    const matches = findAlicizationTurnMemoryContextMessages(result.messages)
    expect(matches).toHaveLength(1)
    expect(matches[0]?.message.content).toBe(result.memoryContext.providerSystemBlock)
    expect(matches[0]?.context.version).toBe('alicization-main-chat-memory-context-v1')
    const currentContextIndex = result.messages.findIndex(
      message => message.content === result.memoryContext.providerSystemBlock,
    )
    const firstNonSystemIndex = result.messages.findIndex(message => message.role !== 'system')
    const lastSystemIndex = result.messages.findLastIndex(message => message.role === 'system')
    const ordinarySystemIndex = result.messages.findIndex(
      message => message.content === '[KEEP_SYSTEM]\npreserve this ordinary system message',
    )
    const assistantIndex = result.messages.findIndex(
      message => message.content === 'preserve this assistant message',
    )
    const userIndex = result.messages.findIndex(
      message => message.content === 'replace the stale typed context',
    )

    expect(firstNonSystemIndex).toBeGreaterThan(0)
    expect(currentContextIndex).toBe(firstNonSystemIndex - 1)
    expect(currentContextIndex).toBe(lastSystemIndex)
    expect(result.messages[currentContextIndex]?.role).toBe('system')
    expect(ordinarySystemIndex).toBeLessThan(currentContextIndex)
    expect(ordinarySystemIndex).toBeLessThan(assistantIndex)
    expect(assistantIndex).toBeLessThan(userIndex)
    expect(result.messages.some(message => message.content === staleMemoryContext)).toBe(false)
  })

  it('persists short-term corrections across turns in the same runtime session', async () => {
    const { runtime } = createWorkingMemoryRuntimeFixture()
    const firstPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '不是这个，别再用旧模板了。',
      } as Message],
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-persist-1',
        messages: [{
          role: 'user',
          content: '不是这个，别再用旧模板了。',
        }],
        supportsTools: true,
      } as any,
      prelude: firstPrelude,
    })

    const secondPrelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续',
      } as Message],
    })
    const secondResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-persist-2',
        messages: [{
          role: 'user',
          content: '继续',
        }],
        supportsTools: true,
      } as any,
      prelude: secondPrelude,
    })

    const { context } = findOnlyAlicizationTurnMemoryContextMessage(secondResult.messages)
    const workingMemoryText = JSON.stringify(context.workingMemory)
    expect(workingMemoryText).toContain('respect_correction(persona):')
    expect(workingMemoryText).toContain('不是这个，别再用旧模板了。')
    expect(context.workingMemory.current.currentUserMove).toBe('继续')
  })

  it('keeps project-state engineering blocks out of ordinary dialogue while keeping typed WorkingMemory context', async () => {
    const { runtime } = createWorkingMemoryRuntimeFixture({
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [
        '[ALICIZATION_PROJECT_STATE]\nidentity=Alicization is a local-first digital life project.',
        '[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]\nstatus=partial',
        '[ALICIZATION_CURRENT_CONSCIOUS_FRAME]\nOpen closure focus: memory still needs stronger end-to-end closure.\nProject continuity self line required: yes.',
        `[CORE:${hostName}]`,
      ],
    })

    for (const userText of ['你好', '你是谁', '今天好累', '随便聊聊']) {
      const prelude = createReflectivePrelude({
        messages: [{
          role: 'user',
          content: userText,
        } as Message],
      })
      prelude.executionCallbackContextPromise = Promise.resolve({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      })
      prelude.executionLedgerContextPromise = Promise.resolve({
        entries: [],
        recallText: '',
        systemBlock: '',
      })
      prelude.executionCapabilityInquiry = {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: false,
        hasCommandLiteral: false,
      }

      const result = await runtime.prepareExecution({
        payload: {
          cardId: 'default',
          turnId: `turn-ordinary-dialogue-${userText}`,
          messages: [{
            role: 'user',
            content: userText,
          }],
          supportsTools: true,
        } as any,
        prelude,
      })

      const systemText = result.messages
        .filter(message => message.role === 'system')
        .map(message => String(message.content))
        .join('\n')

      expect(findOnlyAlicizationTurnMemoryContextMessage(result.messages).message.content)
        .toBe(result.memoryContext.providerSystemBlock)
      expect(systemText).not.toMatch(/\[[A-Z][A-Z0-9_]{4,}\]/u)
      expect(systemText).not.toContain('Open closure focus')
      expect(systemText).not.toContain('Project continuity self line required')
      expect(systemText).not.toContain('Make the latest landed Phase 1 progress explicit')
      expect(systemText).not.toContain('Keep the still-open closure work explicit')
      expect(systemText).not.toContain('Make the next closure target explicit')
      expect(systemText).not.toContain('when the host asks for project status')
      expect(systemText).not.toContain('legacy phase-one template')
      expect(systemText).not.toContain('identity-continuity')
      expect(systemText).not.toContain('主人')
      expect(systemText).not.toContain('女仆')
    }
  }, 20_000)

  it('keeps organic governance blocks out of ordinary dialogue provider messages', async () => {
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
    const { runtime } = createWorkingMemoryRuntimeFixture({
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
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.relationshipPosture).toBe('restrained')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.replyDeliberation?.speakingFrom).toBe('task-thread')
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
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.openingMove).toContain('Repair the seam before leaning closer')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.openingMove).toContain('Repair the seam before leaning closer')
  })

  it('keeps ordinary continuation turns free of canonical project-state prompt governance when the payload did not explicitly request project-state', async () => {
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

    const mindTurnContract = result.mindTurnContract
    const answerPlanner = result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner
    const providerSystemText = result.messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')
    const returnedProjectStateText = JSON.stringify({
      diagnostics,
      projectState: mindTurnContract?.projectState ?? null,
      preDialogueClosure: mindTurnContract?.preDialogueClosure ?? null,
    })

    expect(findOnlyAlicizationTurnMemoryContextMessage(result.messages).message.content)
      .toBe(result.memoryContext.providerSystemBlock)
    expect(providerSystemText).not.toMatch(/\[[A-Z][A-Z0-9_]{4,}\]/u)
    expect(providerSystemText).not.toContain('pre_turn_context_digest')
    expect(providerSystemText).not.toContain('legacy phase-one template')
    expect(providerSystemText).not.toContain('continuity state')
    expect(providerSystemText).not.toContain('phase1_local_digital_life_anchor')

    expect(String(answerPlanner?.governingProject ?? '')).toBe('')
    expect(answerPlanner?.mustDo.some(item =>
      item.includes('identity-continuity')
      || item.includes('same project-aware self line')
      || item.includes('same digital-life closure seam'),
    )).toBe(false)
    expect(returnedProjectStateText).not.toContain('pre_turn_context_digest')
    expect(returnedProjectStateText).not.toContain('legacy phase-one template')
    expect(returnedProjectStateText).not.toContain('continuity state')
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
    expect(result.organicMemoryContext?.memoryDeliberation?.unsafeDetails).toEqual([
      'Do not assert which exact wording or day belonged to that old seam.',
    ])
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.dialogueActKernel?.selectedEvidence[0]?.summary).toContain('That period kept bending toward the runtime seam until it held together.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner?.answerIntent).toContain('fragmentary')
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

    expect(result.organicMemoryContext?.memoryDeliberation?.selectedEpisodes[0]?.provenance).toBe('dreamt')
    expect(result.organicMemoryContext?.memoryDeliberation?.unsafeDetails).toEqual([
      'Do not state the dream residue as a lived remembered fact.',
    ])
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame?.shouldWithholdSpecificity).toBe(true)
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
    const providerMemoryContext = findOnlyAlicizationTurnMemoryContextMessage(result.messages).context
    expect(providerMemoryContext.workingMemory.owner).toBe('working-memory')
    expect(result.messages.map(message => String(message.content ?? '')).join('\n'))
      .not
      .toContain('[ALICIZATION_MEMORY_TURN_GOVERNANCE]')
    expect(result.turnGraph.learning.activeSelfRevisionPatchId).toBeNull()
    expect(result.turnGraph.learning.activeSelfRevisionDecisionTraceId).toBeNull()
  })
})
