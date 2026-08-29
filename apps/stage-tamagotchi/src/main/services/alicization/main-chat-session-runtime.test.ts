import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationSensoryCacheSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput } from './agent-runtime'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'
import type {
  AlicizationPreparedMainChatPrelude,
} from './main-chat-session-runtime'

import { readFileSync } from 'node:fs'

import {
  buildAlicizationProviderFactBlock,
  resolveAlicizationChatFailureSurface,
} from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { createAlicizationAgentRuntime } from './agent-runtime'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
import { createWorkingMemoryStore } from './life-core/working-memory-store'
import { filterAlicizationProviderSystemMessages } from './main-chat-runtime-surface'
import {
  createAlicizationMainChatSessionRuntime,
} from './main-chat-session-runtime'
import { createAlicizationMainChatPreludeRuntime } from './runtime-main-chat-prelude'

type ExecutiveTurnOrganicMemoryTuneInput = Parameters<
  Parameters<typeof createAlicizationMainChatSessionRuntime>[0]['tuneOrganicMemoryPromptContextForExecutiveTurn']
>[0]

type MainRuntimeCorePromptBlocksInput = Parameters<
  Parameters<typeof createAlicizationMainChatSessionRuntime>[0]['buildMainRuntimeCorePromptBlocks']
>[0]

type WorkingMemoryLongTermQueueEnqueue = NonNullable<
  Parameters<typeof createAlicizationMainChatSessionRuntime>[0]['enqueueWorkingMemoryLongTermQueue']
>

type WorkingMemoryLongTermQueueScopedDrain = NonNullable<
  Parameters<typeof createAlicizationMainChatSessionRuntime>[0]['drainWorkingMemoryLongTermQueueScoped']
>

describe('main chat runtime architecture', () => {
  it('does not derive Coding Agent authority from the old dialogue encounter projection', () => {
    const source = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('dialogueEncounter?.codingAgentDelegation')
    expect(source).toContain('codingAgentExecutionIntent')
  })
})

function createWorkingMemoryLongTermEvidence(input: {
  kind: 'episode' | 'preference' | 'relationship' | 'procedure' | 'correction'
  summary: string
  reason: string
  evidenceSnippet: string
  sensitivity?: 'public' | 'personal' | 'private' | 'secret'
}) {
  return {
    version: 'working-memory-long-term-evidence-v1' as const,
    source: 'explicit-structured-memory-evidence' as const,
    kind: input.kind,
    summary: input.summary,
    reason: input.reason,
    evidenceSnippets: [input.evidenceSnippet],
    salience: 0.8,
    sensitivity: input.sensitivity ?? 'personal',
    confidence: 0.86,
  }
}

type PreparedPreludeWithRuntimeSurface = AlicizationPreparedMainChatPrelude & {
  perceptionAugmentation: AlicizationPreparedMainChatPrelude['perceptionAugmentation'] & {
    digitalLifeRuntimeSurface: NonNullable<
      AlicizationPreparedMainChatPrelude['perceptionAugmentation']['digitalLifeRuntimeSurface']
    >
  }
}

interface ParsedAlicizationTurnMemoryContext {
  type: 'alicization-turn-memory-context'
  data: {
    version: string
    workingMemory: {
      version: string
      owner: string
      current: {
        currentUserMove?: string | null
        [key: string]: unknown
      }
      rememberedItems: string[]
      [key: string]: unknown
    }
    longTermRecall: {
      owner: string
      status: string
      evidence: Array<{
        id: string
        summary: string
        source: string
        [key: string]: unknown
      }>
      [key: string]: unknown
    } | null
  }
}

function parseAlicizationTurnMemoryContext(message: Message) {
  if (message.role !== 'system' || typeof message.content !== 'string')
    return null

  try {
    const parsed = JSON.parse(message.content) as Partial<ParsedAlicizationTurnMemoryContext>
    return parsed.type === 'alicization-turn-memory-context' && parsed.data
      ? parsed.data
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

const executionChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
] as const

function createPrelude(overrides?: {
  actionObligation?: {
    confidence: number
    kind: 'answer' | 'clarify' | 'inspect'
    reasonCodes: string[]
    source: 'dialogue-governance'
    summary: string
  }
  codingAgentExecutionIntent?: {
    confidence: number
    intentKind: 'capability-query' | 'execute'
    requestedAgent: 'auto' | 'codex' | 'claude-code' | 'cli' | null
    scope: 'none' | 'investigation' | 'edit' | 'command'
    sourceTurnId: string
    source: 'heuristic' | 'structured-cognition' | 'fallback'
    verdict: 'respond-directly' | 'clarify' | 'delegate-coding-agent'
  }
  messages?: Message[]
}): PreparedPreludeWithRuntimeSurface {
  return {
    actionObligation: overrides?.actionObligation ?? {
      confidence: 0.94,
      kind: 'answer',
      source: 'dialogue-governance',
      reasonCodes: ['owed-action:answer-general'],
      summary: 'Answer from the current dialogue and memory context.',
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
      promptSystemBlocks: [],
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
        turnMode: 'answer',
        personaKernelMode: 'full',
        codingAgentExecutionIntent: overrides?.codingAgentExecutionIntent ?? null,
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
}): PreparedPreludeWithRuntimeSurface {
  const prelude = createPrelude({
    actionObligation: {
      confidence: 0.62,
      kind: 'answer',
      source: 'dialogue-governance',
      reasonCodes: ['stay-on-thread'],
      summary: 'Stay on the same dialogue continuity line and answer directly.',
    },
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

function createEmptyLongTermMemoryEvidenceBundle(
  currentUserText = '',
): LongTermMemoryEvidenceBundle {
  return {
    intent: {
      mode: 'none',
      shouldRecall: false,
      confidence: 0,
      rationale: 'No durable memory signal.',
      temporalFocus: 'unspecified',
      targetKinds: [],
      queryHints: [],
      riskFlags: [],
    },
    plan: {
      rawQuery: currentUserText,
      normalizedQuery: currentUserText,
      keywordQueries: [],
      phraseQueries: [],
      charGramQueries: [],
      semanticQueries: [],
      episodicQueries: [],
      temporalHints: [],
      entityHints: [],
      procedureHints: [],
      threadHints: [],
      negativeCues: [],
      riskFlags: [],
      targetKinds: [],
    },
    evidence: [],
    confidence: 0,
    budgetClass: 'none',
  }
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
  it('forwards the per-tool abort signal through the session resume adapter', async () => {
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
          usagePercent: 12.5,
        },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resumeMainGatewayTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch' as const,
      thread: {
        id: 'thread-resume-signal',
        selectedChannel: 'codex' as const,
        status: 'completed' as const,
      },
      plan: {
        state: 'routed' as const,
      },
      summary: 'resumed',
      output: null,
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      executeMainGatewayTaskThread: vi.fn(),
      resumeMainGatewayTaskThread,
      getPerformanceManifest: vi.fn(async () => ({ rigVersion: 1 } as any)),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '',
        source: 'card-soul' as const,
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
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const outerController = new AbortController()
    const toolController = new AbortController()
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-resume-signal',
        messages: [{
          role: 'user',
          content: '继续这个 Codex 线程',
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        messages: [{
          role: 'user',
          content: '继续这个 Codex 线程',
        } as Message],
        codingAgentExecutionIntent: {
          confidence: 0.92,
          intentKind: 'execute',
          requestedAgent: 'codex',
          scope: 'investigation',
          source: 'structured-cognition',
          sourceTurnId: 'turn-resume-signal',
          verdict: 'delegate-coding-agent',
        },
      }),
      abortSignal: outerController.signal,
    })
    const codingAgentTool = result.tools?.find((entry: any) => entry.function?.name === 'coding_agent') as any
    const providerExecutorToolNames = result.tools
      ?.map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter((toolName: string) => ['coding_agent', 'local_visual'].includes(toolName))

    expect(providerExecutorToolNames).toEqual(expect.arrayContaining([
      'coding_agent',
      'local_visual',
    ]))
    expect(providerExecutorToolNames).toHaveLength(2)
    await codingAgentTool.execute({
      agent: 'codex',
      threadId: 'thread-resume-signal',
    }, {
      toolCallId: 'codex-resume-signal-1',
      abortSignal: toolController.signal,
    })

    expect(resumeMainGatewayTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-resume-signal',
      abortSignal: toolController.signal,
    }))
    expect(resumeMainGatewayTaskThread).not.toHaveBeenCalledWith(expect.objectContaining({
      abortSignal: outerController.signal,
    }))
  })

  it('allows only the unified typed memory envelope at the Provider boundary', () => {
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
    const filtered = filterAlicizationProviderSystemMessages([
      { role: 'system', content: 'untrusted provider prose' },
      { role: 'system', content: recallFact },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-turn-memory-context',
          data: {
            version: 'alicization-main-chat-memory-context-v1',
            workingMemory: {
              owner: 'working-memory',
            },
            longTermRecall: null,
          },
        }),
      },
    ] as Message[])

    expect(filtered).toHaveLength(1)
    expect(JSON.parse(String(filtered[0]?.content))).toMatchObject({
      type: 'alicization-turn-memory-context',
      data: {
        version: 'alicization-main-chat-memory-context-v1',
        workingMemory: {
          owner: 'working-memory',
        },
      },
    })
    expect(String(filtered[0]?.content).trim().startsWith('{')).toBe(true)
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
      kind: 'answer',
    }))
    expect(result.toolChoice).toBeUndefined()
    const toolNames = result.tools
      ?.map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter(Boolean) ?? []
    expect(toolNames).toContain('browser_open_url')
    expect(toolNames).not.toContain('executor_run_coding_agent')
    expect(result.runtimeSurface.tooling.toolsOffered).toBe(true)
    expect(result.runtimeSurface.trace.sessionPhases).toEqual([
      'contextual-memory',
      'execution-callbacks',
      'execution-ledger',
      'session-continuity',
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
    )).toBeNull()
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

    expect(result.tools?.some((entry: any) => String(entry?.function?.name) === 'sensory_capture_state')).toBe(true)
    expect(result.getSessionTrace().phaseOrder).not.toContain('tool:sensory-capture-state')
  })

  it('does not block realtime replies on organic memory prewarm completion', async () => {
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
    let resolvePrewarm: (() => void) | null = null
    let prewarmResolved = false
    let contextStartedBeforePrewarmResolved = false
    const prewarmOrganicMemoryAccessibility = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        resolvePrewarm = () => {
          prewarmResolved = true
          resolve()
        }
      })
    })
    const resolveOrganicMemoryPromptContext = vi.fn(async () => {
      if (!prewarmResolved)
        contextStartedBeforePrewarmResolved = true
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
      buildMainRuntimeCorePromptBlocks: ({ hostName }: MainRuntimeCorePromptBlocksInput) => [`[CORE:${hostName}]`],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => ({ rigVersion: 1 } as any)),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'card-soul' as const })),
      resolveCardHostName: vi.fn(async () => 'Kirito'),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      prewarmOrganicMemoryAccessibility,
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      resolveTurnRetrievalPolicySnapshot: vi.fn(async () => ({
        policy: {
          reasonCodes: ['simple-greeting'],
        },
        plan: {
          budgetClass: 'realtime-reply',
          prewarmKey: 'simple-greeting',
        },
      }) as any),
    })
    const messages = [{
      role: 'user',
      content: '你好',
    } as Message]

    const resultPromise = runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-realtime-prewarm',
        messages,
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        actionObligation: {
          confidence: 0.8,
          kind: 'answer',
          source: 'dialogue-governance',
          reasonCodes: ['simple-greeting'],
          summary: 'Answer a simple greeting directly.',
        },
        messages,
      }),
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(prewarmOrganicMemoryAccessibility).toHaveBeenCalledTimes(1)
    const releasePrewarm = resolvePrewarm as (() => void) | null
    expect(releasePrewarm).toBeTruthy()
    releasePrewarm?.()
    await resultPromise

    expect(resolveOrganicMemoryPromptContext).toHaveBeenCalledTimes(1)
    expect(contextStartedBeforePrewarmResolved).toBe(true)
  })

  it('offers browser tools without narrowing the provider tool registry', async () => {
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

    const prelude = createPrelude({
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

    expect(result.toolChoice).toBeUndefined()
    const toolNames = result.tools
      ?.map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter(Boolean) ?? []
    expect(toolNames).toContain('browser_open_url')
    expect(toolNames).not.toContain('executor_run_coding_agent')
  })

  it('offers desktop tools without narrowing the provider tool registry', async () => {
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

    const prelude = createPrelude({
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

    expect(result.toolChoice).toBeUndefined()
    const toolNames = result.tools
      ?.map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter(Boolean) ?? []
    expect(toolNames).toContain('desktop_inspect_scene')
    expect(toolNames).not.toContain('executor_run_coding_agent')
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
      retrieveLongTermMemoryEvidence: vi.fn(async input =>
        createEmptyLongTermMemoryEvidenceBundle(input.currentUserText)),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const prelude = createPrelude({
      messages: [{
        role: 'user',
        content: '你现在能不能用 CLI 和 Codex？回答前先把当前记忆项目做到哪一步、还差什么闭环放在心里。',
      } as Message],
      actionObligation: {
        confidence: 0.71,
        kind: 'answer',
        source: 'dialogue-governance',
        reasonCodes: ['owed-action:answer-general'],
        summary: 'Answer from the current dialogue and capability facts.',
      },
    })
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-main-capability-project-briefing-summary-only',
        messages: [{
          role: 'user',
          content: '你现在能不能用 CLI 和 Codex？回答前先把当前记忆项目做到哪一步、还差什么闭环放在心里。',
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
      providerToolsSupported: null,
      toolsOfferedThisTurn: true,
      source: 'unobserved',
      checkedAt: null,
      lastError: null,
      channels: [
        { channel: 'cli', available: true, enabled: true, ready: true, reason: null },
        { channel: 'codex', available: true, enabled: true, ready: true, reason: null },
        { channel: 'claude-code', available: true, enabled: true, ready: true, reason: null },
        { channel: 'openclaw', available: false, enabled: false, ready: false, reason: 'offline' },
      ],
    })
    expect(systemText).toContain('"type":"alicization-execution-capabilities"')
  })

  it('keeps executor selection model-owned and preserves the complete registry', async () => {
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
      retrieveLongTermMemoryEvidence: vi.fn(async input =>
        createEmptyLongTermMemoryEvidenceBundle(input.currentUserText)),
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: (input: ExecutiveTurnOrganicMemoryTuneInput) => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const prelude = createPrelude({
      messages: [{
        role: 'user',
        content: '继续沿着这个记忆项目闭环往下，直接帮我用 Codex 查一下现在这个目录的情况，不要用 CLI，也别把当前任务线弄丢。',
      } as Message],
      codingAgentExecutionIntent: {
        confidence: 0.94,
        intentKind: 'execute',
        requestedAgent: 'codex',
        scope: 'investigation',
        source: 'structured-cognition',
        sourceTurnId: 'turn-main-session-direct-execution-project-briefing',
        verdict: 'delegate-coding-agent',
      },
    })
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-main-session-direct-execution-project-briefing',
        messages: [{
          role: 'user',
          content: '继续沿着这个记忆项目闭环往下，直接帮我用 Codex 查一下现在这个目录的情况，不要用 CLI，也别把当前任务线弄丢。',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    const actionFact = findAlicizationProviderFact(result.messages, 'alicization-action-obligation')
    const systemText = result.messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content ?? ''))
      .join('\n')

    expect(actionFact).toBeNull()
    expect(result.toolChoice).toBeUndefined()
    const toolNames = result.tools
      ?.map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter(Boolean) ?? []
    expect(toolNames.filter(toolName => ['coding_agent', 'local_visual'].includes(toolName))).toEqual(expect.arrayContaining([
      'coding_agent',
      'local_visual',
    ]))
    expect(toolNames.filter(toolName => ['coding_agent', 'local_visual'].includes(toolName))).toHaveLength(2)
    expect(toolNames).toContain('browser_open_url')
    expect(systemText).toContain('"type":"alicization-execution-capabilities"')
    const codingAgentTool = result.tools
      ?.find((entry: any) => entry.function?.name === 'coding_agent') as any
    expect(codingAgentTool.function.parameters.properties.agent).toEqual({
      type: 'string',
      const: 'codex',
    })
    const providerStreamingId = result.toolCallIdentity.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-codex-streaming-1',
      toolName: 'codex',
      arguments: {
        prompt: '检查当前目录',
      },
    })
    const driftingStreamingId = result.toolCallIdentity.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-codex-streaming-2',
      toolName: 'codex',
      arguments: {
        prompt: '检查当前目录',
      },
    })

    expect(driftingStreamingId).toBe(providerStreamingId)

    const capabilityQuestion = '你认为你可以用 codex 做什么，你可以帮我写项目或者帮我修改现有的项目吗？'
    const capabilityResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-main-session-codex-capability-question',
        messages: [{
          role: 'user',
          content: capabilityQuestion,
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        messages: [{
          role: 'user',
          content: capabilityQuestion,
        } as Message],
      }),
    })

    expect(capabilityResult.toolChoice).toBeUndefined()
    const capabilityToolNames = capabilityResult.tools
      ?.map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter(Boolean) ?? []
    expect(capabilityToolNames).toEqual(expect.arrayContaining(['local_visual']))
    expect(capabilityToolNames).not.toContain('coding_agent')
    expect(capabilityToolNames).not.toContain('cli')

    const localDirectoryQuery = '你看看桌面的git文件夹有哪些项目，列举给我'
    const localDirectoryResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-main-session-local-directory-query',
        messages: [{
          role: 'user',
          content: localDirectoryQuery,
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude({
        messages: [{
          role: 'user',
          content: localDirectoryQuery,
        } as Message],
        codingAgentExecutionIntent: {
          confidence: 0.94,
          intentKind: 'execute',
          requestedAgent: 'cli',
          scope: 'command',
          source: 'structured-cognition',
          sourceTurnId: 'turn-main-session-local-directory-query',
          verdict: 'delegate-coding-agent',
        },
      }),
    })

    const localDirectoryToolNames = localDirectoryResult.tools
      ?.map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter(Boolean) ?? []
    expect(localDirectoryToolNames.filter(toolName => ['cli', 'local_visual'].includes(toolName))).toEqual([
      'cli',
      'local_visual',
    ])
    expect(localDirectoryToolNames).not.toContain('openclaw')
  })

  it('respects provider tool capability independently of user wording', async () => {
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
        turnId: 'turn-provider-tools-disabled',
        messages: [{
          role: 'user',
          content: '用cli命令帮我查一下桌面有什么文件',
        }],
        supportsTools: false,
        waitForTools: false,
        providerToolCapabilityObservation: {
          supported: false,
          source: 'observed-provider-error',
          checkedAt: 1_786_000_000_000,
          lastError: 'provider-tools-unsupported',
        },
      } as any,
      prelude: createPrelude({
        messages: [{
          role: 'user',
          content: '用cli命令帮我查一下桌面有什么文件',
        } as Message],
      }),
    })

    expect(result.runtimeSurface.tooling.allowTools).toBe(false)
    expect(result.runtimeSurface.tooling.waitForTools).toBe(false)
    expect(result.runtimeSurface.tooling.toolsOffered).toBe(false)
    expect(result.waitForTools).toBe(false)
    expect(result.toolChoice).toBeUndefined()
    expect(result.tools).toBeUndefined()
    expect(findAlicizationProviderFact(
      result.messages,
      'alicization-execution-capabilities',
    )?.data).toMatchObject({
      providerToolsSupported: false,
      toolsOfferedThisTurn: false,
      source: 'observed-provider-error',
      checkedAt: 1_786_000_000_000,
      lastError: 'provider-tools-unsupported',
    })
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
          nextLearningReason: 'learning:internalize',
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

    const prepared = await runtime.prepareExecution({
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

    expect(scheduleOrganicLearningAction).not.toHaveBeenCalled()

    await prepared.commitMemoryWriteIntent?.({
      assistantText: '我会把验证优先落实到这轮成功回复之后。',
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
          source: 'dialogue-governance',
          reasonCodes: ['owed-action:answer-general'],
          summary: 'The turn should stay on direct truthful reply rather than action dispatch.',
        },
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
    expect(result.runtimeSurface.action).toEqual(expect.objectContaining({ kind: 'answer' }))
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
          source: 'dialogue-governance',
          reasonCodes: ['stay-on-thread'],
          summary: 'Stay on the same dialogue line and answer directly.',
        },
        messages: [{
          role: 'user',
          content: '那你就顺着上一轮继续说。',
        } as Message],
      }),
    })

    expect(secondResult.conversationSessionId).toBe(firstResult.conversationSessionId)
    expect(secondResult.sessionMirror).toBeTruthy()
  })

  it('keeps stale session mirrors out of provider facts', async () => {
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
          source: 'dialogue-governance',
          reasonCodes: ['reset-line'],
          summary: 'Answer directly without carrying stale session state as current.',
        },
        messages: [{
          role: 'user',
          content: '现在重新开始。',
        } as Message],
      }),
    })

    expect(findAlicizationProviderFact(
      result.messages,
      'alicization-dialogue-session-mirror',
    )).toBeNull()
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toContain(['mirror', '_memory:'].join(''))
    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toContain('mirror_runtime_continuity:')

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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(persistAutobiographicalEpisodesFromPreparedMirror).not.toHaveBeenCalled()

    await firstResult.commitMemoryWriteIntent?.({
      assistantText: '我会沿着这条连续性继续。',
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
    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toContain('mirror_runtime_continuity:')
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
      buildMainRuntimeCorePromptBlocks: () => [],
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

    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toContain('mirror_runtime_continuity:')
    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toContain('loop:')
    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toMatch(/dominant:[^|]+/u)
    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toMatch(/phase:[^|]+/u)
    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toMatch(/handoff:[^|]+/u)
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
      buildMainRuntimeCorePromptBlocks: () => [],
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

    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toContain('mirror_runtime_continuity:')
    expect(String(secondOrganicInput?.recallSeed ?? '')).not.toContain('stage: same-thread-continuation')
    expect(second.sessionMirror?.continuityArcSummary).toBeNull()

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

    expect(String(thirdOrganicInput?.recallSeed ?? '')).not.toContain('mirror_runtime_continuity:')
    expect(String(thirdOrganicInput?.recallSeed ?? '')).not.toContain('stage: same-thread-continuation')

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
    expect(fourth.sessionMirror?.continuityArcSummary).toBeNull()
  }, 15_000)

  it('does not serialize autobiographical afterglow metadata into the next recall query', async () => {
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('continuity_afterglow:')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('thread=runtime seam')
  })

  it('keeps ordinary dialogue turns on the full preparation mainline', async () => {
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
            codingAgentExecutionIntent: null,
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

    expect(result.runtimeSurface.trace.sessionPhases).toContain('execution-callbacks')
    expect(result.runtimeSurface.trace.sessionPhases).toContain('execution-ledger')
    expect(result.runtimeSurface.trace.sessionPhases).toContain('performance-manifest')
    expect(result.runtimeSurface.trace.sessionPhases).toContain('tool-registry')
    expect(result.runtimeSurface.trace.sessionPhases).toContain('execution-capabilities')
    expect(result.runtimeSurface.tooling.allowTools).toBe(true)
    expect(result.runtimeSurface.tooling.waitForTools).toBe(true)
    expect(result.tools).toBeDefined()
    expect(getPerformanceManifest).toHaveBeenCalledTimes(1)
    expect(result.performanceManifest).toEqual(expect.objectContaining({
      rigVersion: 1,
    }))
    expect(resolveExecutionCapabilitiesForPrompt).toHaveBeenCalledTimes(1)
    expect(result.messages.some(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[VESSEL]'),
    )).toBe(false)
  })

  it('does not serialize held-autonomy metadata into organic memory retrieval', async () => {
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('continuity_held_autonomy:')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('thread_id=thread-runtime')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('intent_id=follow-through')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('same-line/closure-seam')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('project-carry/phase-1')
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('continuity_cadence_reconfirmation:')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('cadence=')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('blink=')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('gaze=')
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('continuity_held_autonomy:')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('mirror_runtime_continuity:')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('loop:')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('thread_id=thread-held-autonomy-later')
    expect(second.sessionMirror?.continuityArcSummary).toBeNull()
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('continuity_held_autonomy:')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('thread_id=thread-runtime-deferred')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('defer_reason=busy-host')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('model_summary=stay near the unresolved compile seam without reopening visible speech')
    expect(String(organicInput?.recallSeed ?? '')).not.toContain('mirror_runtime_continuity:')
    expect(second.sessionMirror).toBeTruthy()
  })

  it('tracks performance manifest metadata without forwarding untyped prompt blocks', async () => {
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
            codingAgentExecutionIntent: null,
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

    expect(result.runtimeSurface.trace.sessionPhases).toContain('performance-manifest')
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

  it('keeps recent executor output as structured facts without deriving a reply obligation from user wording', async () => {
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
          source: 'dialogue-governance',
          reasonCodes: ['owed-action:answer-general'],
          summary: 'The turn should stay on direct truthful reply rather than action dispatch.',
        },
        messages: [{
          role: 'user',
          content: '刚才那个命令结果呢',
        } as Message],
      }),
    })

    const callbackFact = findAlicizationProviderFact(
      result.messages,
      'alicization-execution-callbacks',
    )

    expect(callbackFact?.data).toMatchObject({
      callbacks: [expect.objectContaining({
        channel: 'cli',
        goal: 'Run the CLI check command',
        outcome: 'all tests passed',
        status: 'completed',
      })],
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

  it('carries active ledger context as typed facts without replaying ledger prompt prose', async () => {
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
            source: 'dialogue-governance',
            reasonCodes: ['owed-action:answer-general'],
            summary: 'The turn should stay on direct truthful reply rather than action dispatch.',
          },
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
            eventKinds: ['dispatch'],
            goal: 'Investigate the runtime regression',
            outcome: '',
            status: 'running',
            summary: 'Regression investigation is running',
          }],
          recallText: [
            'execution_project_identity:typed runtime execution context.',
            'execution_runtime_route:desktop-runtime.',
            'execution_memory_line:structured memory digest.',
            'execution_memory_hold:typed-runtime-carry.',
            'execution_project_continuity:structured execution context remains active for this turn.',
            'execution_project_boundary:Use only verified execution ledger entries.',
            'execution_channel:claude-code execution_status:running execution_goal:Investigate the runtime regression',
          ].join('\n'),
          systemBlock: buildAlicizationProviderFactBlock('alicization-execution-ledger', {
            entries: [{
              activityAt: 20,
              channel: 'claude-code',
              eventKinds: ['dispatch'],
              goal: 'Investigate the runtime regression',
              outcome: '',
              status: 'running',
              summary: 'Regression investigation is running',
            }],
          }),
        }),
      },
    })

    const ledgerFact = findAlicizationProviderFact(
      result.messages,
      'alicization-execution-ledger',
    )
    expect(ledgerFact?.data).toMatchObject({
      entries: [expect.objectContaining({
        channel: 'claude-code',
        goal: 'Investigate the runtime regression',
        status: 'running',
      })],
    })
    const providerText = result.messages.map(message => String(message.content ?? '')).join('\n')
    expect(providerText).not.toContain('[ALICIZATION_EXECUTION_REPLY_OBLIGATION]')
    expect(providerText).not.toContain('[ALICIZATION_EXECUTION_LEDGER]')
    expect(providerText).not.toContain('Recent structured executor history for the current session.')
    expect(providerText).not.toContain('project_identity=')
    expect(providerText).not.toContain('continuity_')
  })

  it('provides callback and ledger facts without runtime arbitration when both are present', async () => {
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
            source: 'dialogue-governance',
            reasonCodes: ['owed-action:answer-general'],
            summary: 'The turn should stay on direct truthful reply rather than action dispatch.',
          },
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
            'execution_project_identity:typed runtime execution context.',
            'execution_runtime_route:desktop-runtime.',
            'execution_memory_line:structured memory digest.',
            'execution_memory_hold:typed-runtime-carry.',
            'execution_project_continuity:structured execution context remains active for this turn.',
            'execution_project_boundary:Use only verified execution ledger entries.',
            'execution_channel:codex execution_status:needs-affirmation execution_goal:Patch the unresolved Alicization runtime seam',
          ].join('\n'),
          systemBlock: buildAlicizationProviderFactBlock('alicization-execution-ledger', {
            entries: [{
              activityAt: 40,
              channel: 'codex',
              eventKinds: ['plan'],
              goal: 'Patch the unresolved Alicization runtime seam',
              outcome: '',
              status: 'needs-affirmation',
              summary: 'Execution is waiting for affirmation before codex can act on Patch the unresolved Alicization runtime seam.',
            }],
          }),
        }),
      },
    })

    const ledgerFact = findAlicizationProviderFact(
      result.messages,
      'alicization-execution-ledger',
    )

    expect(ledgerFact?.data).toMatchObject({
      entries: [expect.objectContaining({
        channel: 'codex',
        goal: 'Patch the unresolved Alicization runtime seam',
        status: 'needs-affirmation',
      })],
    })
    expect(findAlicizationProviderFact(
      result.messages,
      'alicization-execution-callbacks',
    )?.data).toMatchObject({
      callbacks: [expect.objectContaining({
        channel: 'cli',
        goal: 'Run pnpm typecheck',
        status: 'completed',
      })],
    })
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(result.messages.map(message => String(message.content ?? '')).join('\n'))
      .not
      .toMatch(/\[[A-Z][A-Z0-9_]{4,}\]/u)
    expect(result.sessionMirror?.recollection).toMatchObject({
      afterthoughtState: 'ripe',
      certainty: 'approximate',
      confidence: 0.79,
      foreground: null,
      placement: 'internal-only',
      surfaceMode: 'internal-only',
      visibility: 'inward',
    })
    const legacySerializedCues = [
      'foreground=',
      ['surface', 'inward'].join('='),
      'afterthought=ripe',
    ]
    const serializedRecollection = JSON.stringify(result.sessionMirror?.recollection ?? null)
    expect(legacySerializedCues.every(cue => !serializedRecollection.includes(cue))).toBe(true)
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation).toMatchObject({
      selectedConsolidationIds: ['consolidation-runtime'],
      selectedProcedureIds: ['procedure-runtime'],
      surfacePolicy: 'answer-anchoring',
    })
    expect(result.memoryTurnArtifact?.deliberation).toMatchObject({
      surfacePolicy: 'answer-anchoring',
    })
    expect(result.memoryTurnArtifact?.speechPosture).toMatchObject({
      surfaceMode: 'answer-anchoring',
      certainty: 'approximate',
    })
  })

  it('keeps the Provider authority contract content-free', async () => {
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
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      updatedAt: 10,
    }

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-mind-contract-provider',
        messages: [{
          role: 'user',
          content: '先别装可爱，直接告诉我这条运行时线现在还差什么没闭环。',
        }],
        supportsTools: true,
      } as any,
      prelude: reflectivePrelude,
    })
    expect(result.mindTurnContract).toEqual({
      version: 'mind-turn-contract-v1',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      updatedAt: 10,
    })
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
      retrieveLongTermMemoryEvidence: vi.fn(async input =>
        createEmptyLongTermMemoryEvidenceBundle(input.currentUserText)),
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

  it('reuses one prebound agent turn as the session owner during preparation', async () => {
    const agentRuntime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => ({
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
      }),
      resolveConversationSessionId: async () => 'session-prebound',
    })
    const openAgentTurn = vi.fn(
      async input => await agentRuntime.openTurn(input),
    )
    const { runtime } = createWorkingMemoryRuntimeFixture({
      openAgentTurn,
    })
    const payload = {
      cardId: 'default',
      turnId: 'turn-prebound',
      messages: [{ role: 'user', content: '继续当前任务' }],
      supportsTools: true,
    } as any
    const agentTurn = await runtime.openExecutionTurn({
      cardId: payload.cardId,
      turnId: payload.turnId,
    })

    const prepared = await runtime.prepareExecution({
      payload,
      prelude: createReflectivePrelude({
        messages: [{ role: 'user', content: '继续当前任务' } as Message],
      }),
      agentTurn,
    })

    expect(openAgentTurn).toHaveBeenCalledOnce()
    expect(prepared.conversationSessionId).toBe('session-prebound')
    expect(prepared.getSessionTrace()).toEqual(agentTurn.snapshot())
  })

  it('commits the injected WorkingMemory store only after the visible reply settles', async () => {
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

    const prepared = await runtime.prepareExecution({
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

    expect(workingMemoryStore.latest('default')).toBeNull()

    await prepared.commitMemoryWriteIntent?.({
      assistantText: '记忆中心 UI 会继续沿着这条线推进。',
    })

    const latest = workingMemoryStore.latest('default')
    expect(latest?.currentThread?.currentUserMove).toContain('记忆中心 UI')
    expect(latest?.recentRawTurns).toEqual(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-working-memory-visible:user',
        role: 'user',
      }),
      expect.objectContaining({
        turnId: 'turn-working-memory-visible:alice',
        role: 'alice',
        text: '记忆中心 UI 会继续沿着这条线推进。',
      }),
    ]))
    expect(latest?.recentRawTurns.map(turn => turn.turnId)).not.toContain('current-user')
  })

  it('merges persisted history with newer in-memory turns before building WorkingMemory', async () => {
    const workingMemoryStore = createWorkingMemoryStore()
    const listConversationTurnsBySession = vi.fn(async () => [{
      turnId: 'turn-persisted-old',
      sessionId: 'session-1',
      userText: '旧问题',
      assistantText: '旧回答',
      structuredJson: null,
      createdAt: 10,
    }])
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore,
      listConversationTurnsBySession,
    })
    const messages: Message[] = [
      { role: 'user', content: '旧问题' },
      { role: 'assistant', content: '旧回答' },
      { role: 'user', content: '不是这个，最新纠正是先合并尚未落盘的消息。' },
      { role: 'assistant', content: '收到，先保留这条最新纠正。' },
      { role: 'user', content: '继续' },
    ]
    const prelude = createReflectivePrelude({ messages })

    const prepared = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-merge-live-history',
        messages,
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(workingMemoryStore.latest('default')).toBeNull()

    await prepared.commitMemoryWriteIntent?.({
      assistantText: '我会按最新纠正继续。',
    })

    const latest = workingMemoryStore.latest('default')
    const retainedText = [
      ...(latest?.recentRawTurns.map(turn => turn.text) ?? []),
      ...(latest?.compressedTimeline.map(episodelet => episodelet.summary) ?? []),
    ].join('\n')
    expect(retainedText).toContain('旧问题')
    expect(retainedText).toContain('最新纠正是先合并尚未落盘的消息')
    expect(retainedText).toContain('先保留这条最新纠正')
    expect(retainedText.match(/旧问题/gu)).toHaveLength(1)
    expect(listConversationTurnsBySession).toHaveBeenCalledWith('session-1', {
      limit: 6,
    })
  })

  it('loads DB fallback during WorkingMemory hydration instead of session assembly', async () => {
    const listConversationTurnsBySession = vi.fn(async () => [{
      turnId: 'turn-owner-hydration',
      sessionId: 'session-owner-hydration',
      userText: '由 WorkingMemory owner 加载历史。',
      assistantText: '历史加载归 owner 管理。',
      structuredJson: null,
      createdAt: 10,
    }])
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore: createWorkingMemoryStore(),
      getWorkingMemoryCheckpoint: vi.fn(async () => null),
      listConversationTurnsBySession,
    })

    const hydration = await runtime.hydrateWorkingMemory({
      cardId: 'default',
      turnId: 'turn-owner-hydration-current',
      sessionId: 'session-owner-hydration',
    })

    expect(hydration.snapshot).toBeNull()
    expect(hydration.recentTurns).toEqual([
      expect.objectContaining({
        turnId: 'turn-owner-hydration',
        userText: '由 WorkingMemory owner 加载历史。',
        assistantText: '历史加载归 owner 管理。',
      }),
    ])
    expect(listConversationTurnsBySession).toHaveBeenCalledOnce()
  })

  it('hydrates WorkingMemory from a persisted checkpoint when the process store is empty', async () => {
    const workingMemoryStore = createWorkingMemoryStore()
    const checkpoint = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 100,
    })
    checkpoint.currentThread = {
      title: '短期记忆 checkpoint',
      currentUserMove: '继续',
      currentAliceMove: '我会从 checkpoint 恢复',
      primaryAnchor: 'WorkingMemory',
      mode: 'task',
      shouldHold: true,
      confidence: 0.8,
    }
    checkpoint.activeTask = {
      summary: '把短期记忆重启连续性接上',
      status: 'active',
      evidenceTurnIds: ['turn-old:user'],
    }
    checkpoint.userCorrections = [{
      text: '不要让固定模板干扰人格回复',
      sourceTurnId: 'turn-old:user',
      scope: 'persona',
    }]
    checkpoint.commitments = [{
      text: '读写 checkpoint 失败要透明告诉用户',
      sourceTurnId: 'turn-old:user',
    }]

    const getWorkingMemoryCheckpoint = vi.fn(async () => checkpoint)
    const persistWorkingMemoryCheckpoint = vi.fn(async () => {})
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore,
      getWorkingMemoryCheckpoint,
      persistWorkingMemoryCheckpoint,
      listConversationTurnsBySession: vi.fn(async () => []),
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
        turnId: 'turn-working-memory-checkpoint-hydrate',
        messages: [{
          role: 'user',
          content: '继续',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(getWorkingMemoryCheckpoint).toHaveBeenCalledWith('default', 'session-1')
    expect(persistWorkingMemoryCheckpoint).not.toHaveBeenCalled()
    expect(workingMemoryStore.get('default', 'session-1')).toBeNull()

    await result.commitMemoryWriteIntent?.({
      assistantText: '我会从 checkpoint 恢复并继续。',
    })

    expect(persistWorkingMemoryCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'default',
      sessionId: 'session-1',
    }))
    expect(workingMemoryStore.get('default', 'session-1')?.activeTask?.summary)
      .toBe('把短期记忆重启连续性接上')
    expect(result.memoryContext.workingMemory.current.threadTitle)
      .toBe('短期记忆 checkpoint')
    expect(result.memoryContext.workingMemory.rememberedItems).toEqual(expect.arrayContaining([
      '不要让固定模板干扰人格回复',
      '读写 checkpoint 失败要透明告诉用户',
    ]))
  })

  it('hydrates the WorkingMemory owner before organic recall and blocks old transport from the recall/provider chain', async () => {
    const events: string[] = []
    const workingMemoryStore = createWorkingMemoryStore()
    const checkpoint = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 100,
    })
    checkpoint.currentThread = {
      title: 'checkpoint 当前线程',
      currentUserMove: 'checkpoint 当前用户状态',
      currentAliceMove: 'checkpoint 当前助手状态',
      primaryAnchor: 'WorkingMemory owner',
      mode: 'task',
      shouldHold: true,
      confidence: 0.9,
    }
    const perceptionMessages = vi.fn()
    const resolveOrganicMemoryPromptContext = vi.fn(async (input: { recallSeed: string }) => {
      events.push('organic')
      return {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        observedRecallSeed: input.recallSeed,
      }
    })
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore,
      getWorkingMemoryCheckpoint: vi.fn(async () => {
        events.push('checkpoint')
        return checkpoint
      }),
      listConversationTurnsBySession: vi.fn(async () => []),
      resolveOrganicMemoryPromptContext,
    })
    const preludeRuntime = createAlicizationMainChatPreludeRuntime({
      readLatestUserMessageText: (messages) => {
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          if (messages[index]?.role === 'user')
            return String(messages[index]?.content ?? '')
        }
        return ''
      },
      senderWebContentsIdFromInvokeOptions: () => null,
      resolveChatMessages: payload => payload.messages as any,
      buildMainChatContextualString: vi.fn(async () => 'U: 当前用户轮次'),
      buildMainChatExecutionCallbackContext: vi.fn(async () => ({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      })),
      buildMainChatExecutionLedgerContext: vi.fn(async () => ({
        systemBlock: '',
        entries: [],
        recallText: '',
      })) as any,
      augmentMainChatMessagesWithPerception: vi.fn(async (input: { messages: Message[] }) => {
        perceptionMessages(input.messages)
        return {
          messages: input.messages,
          systemBlocks: [],
          promptSystemBlocks: [],
          digitalLifeRuntimeSurface: null,
          memoryRecallSeed: input.messages
            .map(message => String(message.content ?? ''))
            .join('|'),
          recallGovernor: null,
          capture: {
            inspectionRequested: false,
            groundedThisTurn: false,
            snapshot: null,
            fallbackReason: null,
          },
          chatGovernance: {
            turnMode: 'answer' as const,
            personaKernelMode: 'full' as const,
            mindTurnGovernance: null,
          },
        }
      }),
      prepareMainChatSessionExecution: vi.fn(),
    })
    const payload = {
      cardId: 'default',
      turnId: 'turn-owner-prelude-chain',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'system', content: 'system context' },
        { role: 'user', content: '旧 transport 用户轮次' },
        { role: 'assistant', content: '旧 transport 助手轮次' },
        { role: 'user', content: '当前用户轮次' },
      ],
      supportsTools: true,
    } as any
    const prelude = await preludeRuntime.prepareMainChatPrelude(payload, {
      provider: {
        chat: vi.fn(() => ({ provider: 'test-chat' })),
      },
      model: 'gpt-test',
    } as any)

    const result = await runtime.prepareExecution({
      payload,
      prelude,
    })

    expect(events.indexOf('checkpoint')).toBeGreaterThanOrEqual(0)
    expect(events.indexOf('organic')).toBeGreaterThanOrEqual(0)
    expect(events.indexOf('checkpoint')).toBeLessThan(events.indexOf('organic'))
    expect(perceptionMessages).toHaveBeenCalledWith([
      { role: 'system', content: 'system context' },
      { role: 'user', content: '当前用户轮次' },
    ])
    const organicRecallSeed = String(
      resolveOrganicMemoryPromptContext.mock.calls.at(-1)?.[0]?.recallSeed ?? '',
    )
    expect(organicRecallSeed).not.toContain('旧 transport 用户轮次')
    expect(organicRecallSeed).not.toContain('旧 transport 助手轮次')
    expect(organicRecallSeed).toContain('当前用户轮次')
    const providerMessagesText = result.messages
      .map(message => String(message.content ?? ''))
      .join('\n')
    expect(providerMessagesText).not.toContain('旧 transport 用户轮次')
    expect(providerMessagesText).not.toContain('旧 transport 助手轮次')
    expect(providerMessagesText).toContain('当前用户轮次')
  })

  it('does not let a previous session mirror memory summary bypass a WorkingMemory checkpoint owner', async () => {
    const previousMirror = {
      cardId: 'default',
      sessionId: 'session-1',
      updatedAt: 100,
      memorySummary: '旧 transport summary 不应绕过 WorkingMemory',
      recollection: null,
    } as any
    const dialogueSessionManager = {
      clear: vi.fn(),
      commitPreparedExecution: vi.fn((mirror: unknown) => mirror),
      getSessionMirror: vi.fn(() => previousMirror),
      ingestAgentSessionSnapshot: vi.fn(() => previousMirror),
      ingestPreparedExecution: vi.fn(() => previousMirror),
      previewPreparedExecution: vi.fn(() => previousMirror),
    }
    const workingMemoryStore = createWorkingMemoryStore()
    const checkpoint = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 100,
    })
    const resolveOrganicMemoryPromptContext = vi.fn(async (_input: {
      recallSeed?: string
    }) => ({
      hostAttitude: '',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore,
      dialogueSessionManager: dialogueSessionManager as any,
      getWorkingMemoryCheckpoint: vi.fn(async () => checkpoint),
      resolveOrganicMemoryPromptContext,
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-checkpoint-mirror-boundary',
        messages: [{
          role: 'user',
          content: '当前 checkpoint 线程继续。',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '当前 checkpoint 线程继续。',
        } as Message],
      }),
    })

    const organicInput = resolveOrganicMemoryPromptContext.mock.calls.at(-1)?.[0] as {
      recallSeed?: string
    }
    expect(String(organicInput?.recallSeed ?? ''))
      .not
      .toContain('旧 transport summary 不应绕过 WorkingMemory')
    expect(String(organicInput?.recallSeed ?? ''))
      .toContain('memory_recall_mode:thread')
  })

  it('feeds a compressed checkpoint from the previous turn into the next Provider context', async () => {
    const workingMemoryStore = createWorkingMemoryStore()
    let persistedCheckpoint = null as ReturnType<typeof createEmptyWorkingMemorySnapshot> | null
    let now = 100
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore,
      getNow: () => now,
      getWorkingMemoryCheckpoint: vi.fn(async () => persistedCheckpoint),
      persistWorkingMemoryCheckpoint: vi.fn(async (snapshot) => {
        persistedCheckpoint = structuredClone(snapshot)
      }),
      listConversationTurnsBySession: vi.fn(async () => []),
    })
    const firstMessages: Message[] = [
      { role: 'user', content: '第一步先确认长期目标。' },
      { role: 'assistant', content: '目标是让记忆跨轮连续。' },
      { role: 'user', content: '第二步记录用户纠正。' },
      { role: 'assistant', content: '会保留纠正证据。' },
      { role: 'user', content: '第三步验证压缩。' },
      { role: 'assistant', content: '压缩后仍应进入下一轮。' },
      { role: 'user', content: '第四步准备继续。' },
      { role: 'assistant', content: '已经准备继续。' },
    ]

    const firstResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-compress-1',
        messages: firstMessages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages: firstMessages }),
    })

    expect(firstResult.workingMemorySnapshot?.compressedTimeline).toHaveLength(1)
    expect(persistedCheckpoint).toBeNull()

    await firstResult.commitMemoryWriteIntent?.({
      assistantText: '第一轮已经成功完成，可以提交压缩后的 WorkingMemory。',
    })

    expect(persistedCheckpoint?.compressedTimeline).toHaveLength(1)
    const firstEpisodelet = structuredClone(
      persistedCheckpoint!.compressedTimeline[0],
    )

    workingMemoryStore.clear()
    now = 200
    const secondMessages: Message[] = [{
      role: 'user',
      content: '继续刚才压缩后的记忆线。',
    }]
    const secondResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-compress-2',
        messages: secondMessages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages: secondMessages }),
    })
    const providerMemoryContext = findOnlyAlicizationTurnMemoryContextMessage(
      secondResult.messages,
    ).context

    expect(providerMemoryContext.workingMemory.compressedTimeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceTurnIds: firstEpisodelet.sourceTurnIds,
          summary: firstEpisodelet.summary,
          thread: firstEpisodelet.thread,
        }),
      ]),
    )
    expect(
      secondResult.workingMemorySnapshot?.recentRawTurns
        .map(turn => turn.turnId),
    ).not.toEqual(expect.arrayContaining(firstEpisodelet.sourceTurnIds))
    expect(
      secondResult.workingMemorySnapshot?.recentRawTurns
        .filter(turn => turn.role === 'alice')
        .map(turn => turn.text),
    ).not.toContain('这条当前轮回复还没有生成。')
  })

  it('does not reopen DB history after a WorkingMemory checkpoint owns the session', async () => {
    const workingMemoryStore = createWorkingMemoryStore()
    const checkpoint = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 100,
    })
    checkpoint.recentRawTurns = [
      {
        turnId: 'turn-owner-recent:user',
        role: 'user',
        text: 'checkpoint 中仍然活跃的用户轮。',
        createdAt: 90,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: null,
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
        failureSurface: null,
        contaminated: false,
        importance: 0.8,
      },
      {
        turnId: 'turn-owner-recent:alice',
        role: 'alice',
        text: 'checkpoint 中仍然活跃的助手轮。',
        createdAt: 91,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: null,
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
        failureSurface: null,
        contaminated: false,
        importance: 0.7,
      },
    ]
    checkpoint.compressedTimeline = [{
      id: 'episodelet-owned',
      sourceTurnIds: ['turn-owner-compressed:user', 'turn-owner-compressed:alice'],
      summary: 'checkpoint 已经压缩的旧轮次。',
      thread: 'WorkingMemory owner',
      unresolvedQuestions: [],
      commitments: [],
      corrections: [],
      relationshipPosture: null,
      emotionalPosture: null,
      executionCarry: null,
      importance: 0.7,
      createdAt: 80,
    }]
    checkpoint.compression = {
      level: 'light',
      sourceTurnIds: ['turn-owner-compressed:user', 'turn-owner-compressed:alice'],
      lastCompressedAt: 100,
    }
    const listConversationTurnsBySession = vi.fn(async () => [{
      turnId: 'turn-owner-compressed',
      sessionId: 'session-1',
      userText: '这条 DB 历史不应重新进入 raw window。',
      assistantText: '这条 DB 回复也不应重新进入 raw window。',
      structuredJson: JSON.stringify({
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
      }),
      createdAt: 80,
    }])
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore,
      getWorkingMemoryCheckpoint: vi.fn(async () => checkpoint),
      listConversationTurnsBySession,
    })
    const messages: Message[] = [
      { role: 'user', content: '这条 transport 旧消息也不应重新展开。' },
      { role: 'assistant', content: '旧 transport 回复。' },
      { role: 'user', content: '继续' },
    ]

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-owner-next',
        messages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages }),
    })

    expect(listConversationTurnsBySession).not.toHaveBeenCalled()
    expect(result.workingMemorySnapshot?.recentRawTurns.map(turn => turn.turnId))
      .toEqual(expect.arrayContaining([
        'turn-owner-recent:user',
        'turn-owner-recent:alice',
        'turn-owner-next:user',
      ]))
    expect(JSON.stringify(result.workingMemorySnapshot))
      .not
      .toContain('这条 DB 历史不应重新进入 raw window。')
    expect(JSON.stringify(result.workingMemorySnapshot))
      .not
      .toContain('这条 transport 旧消息也不应重新展开。')
    const providerMessagesText = result.messages
      .map(message => String(message.content ?? ''))
      .join('\n')
    expect(providerMessagesText)
      .not
      .toContain('这条 transport 旧消息也不应重新展开。')
    expect(providerMessagesText)
      .not
      .toContain('旧 transport 回复。')
    expect(providerMessagesText)
      .toContain('继续')
    expect(result.workingMemorySnapshot?.compressedTimeline).toEqual([
      expect.objectContaining({
        id: 'episodelet-owned',
        sourceTurnIds: ['turn-owner-compressed:user', 'turn-owner-compressed:alice'],
      }),
    ])
  })

  it('reports WorkingMemory checkpoint persistence failure without blocking the Provider context', async () => {
    const persistWorkingMemoryCheckpoint = vi.fn(async () => {
      throw new Error('checkpoint disk offline')
    })
    const { runtime } = createWorkingMemoryRuntimeFixture({
      persistWorkingMemoryCheckpoint,
      listConversationTurnsBySession: vi.fn(async () => []),
    })
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续把短期记忆落盘',
      } as Message],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-checkpoint-save-failure',
        messages: [{
          role: 'user',
          content: '继续把短期记忆落盘',
        }],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.memoryContext.workingMemory.current.currentUserMove)
      .toContain('继续把短期记忆落盘')
    expect(persistWorkingMemoryCheckpoint).not.toHaveBeenCalled()

    await result.commitMemoryWriteIntent?.({
      assistantText: '我会继续处理短期记忆落盘。',
    })

    expect(result.memoryFailures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-persistence',
        stage: 'working-memory-checkpoint-save',
        errorSummary: 'checkpoint disk offline',
      }),
    ]))
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
      longTermRecall: {
        owner: 'long-term-memory-recall',
        status: 'empty',
        evidence: [],
      },
      availableLongTermEvidenceIds: [],
    })
    expect(result.memoryFailures).toEqual([])
    expect(message.content).toBe(result.memoryContext.providerSystemBlock)
    expect(context).toEqual(JSON.parse(result.memoryContext.providerSystemBlock).data)
    expect(context.workingMemory.current.currentUserMove).toContain('继续这个本地数字生命的工作记忆线。')
    expect(context.workingMemory).not.toHaveProperty('authorityLine')
    expect(context.workingMemory).not.toHaveProperty('longTermQueue')
    expect(providerText).not.toMatch(/\[[A-Z][A-Z0-9_]{4,}\]/u)
  })

  it('applies the production token budget after injecting WorkingMemory and returns an audit report', async () => {
    const { runtime } = createWorkingMemoryRuntimeFixture({
      promptBudgetTokens: 512,
    })
    const prelude = createReflectivePrelude({
      messages: [
        { role: 'system', content: '人格锚点'.repeat(100) } as Message,
        { role: 'assistant', content: '旧历史'.repeat(900) } as Message,
        { role: 'user', content: '当前用户回合：继续处理短期记忆。' } as Message,
      ],
    })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-budget',
        messages: [
          { role: 'system', content: '人格锚点'.repeat(100) },
          { role: 'assistant', content: '旧历史'.repeat(900) },
          { role: 'user', content: '当前用户回合：继续处理短期记忆。' },
        ],
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.promptBudgetReport).toBeDefined()
    expect(result.promptBudgetReport!.totalAfterTokens)
      .toBeLessThanOrEqual(result.promptBudgetReport!.totalBeforeTokens)
    expect(result.promptBudgetReport!.truncated).toBe(true)
    expect(result.promptBudgetReport!.sections.memory.afterTokens).toBeGreaterThan(0)
    expect(result.messages.map(message => String(message.content ?? '')).join('\n'))
      .toContain('当前用户回合：继续处理短期记忆。')
    expect(findOnlyAlicizationTurnMemoryContextMessage(result.messages).context.workingMemory.owner)
      .toBe('working-memory')
  })

  it('projects the working-memory owner into the runtime surface instead of leaving it prompt-only', async () => {
    const { runtime } = createWorkingMemoryRuntimeFixture()
    const prelude = createReflectivePrelude({
      messages: [{
        role: 'user',
        content: '继续这个本地数字生命的工作记忆线。',
      } as Message],
    })
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

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner).toBeNull()
  })

  it('keeps user corrections while isolating failed execution diagnostics from Provider and WorkingMemory', async () => {
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
        outcome: 'Codex produced no semantic progress after retry=5; workbench trace=trace-failure',
        sessionId: 'session-1',
        status: 'failed',
        summary: 'Failed to repair the working-memory prompt after debug retry trace',
        threadId: 'thread-failure',
        turnId: 'turn-failure',
      }],
      continuitySignals: [],
      recallText: 'execution_callback_channel:cli execution_callback_status:failed execution_callback_goal:repair the working-memory prompt execution_callback_outcome:Codex produced no semantic progress after retry=5 workbench_trace=trace-failure',
      systemBlock: buildAlicizationProviderFactBlock('alicization-execution-callbacks', {
        alreadyExecuted: true,
        callbacks: [{
          channel: 'cli',
          createdAt: 10,
          decisionTraceId: 'trace-failure',
          goal: 'repair the working-memory prompt',
          outcome: 'Codex produced no semantic progress after retry=5; workbench trace=trace-failure',
          sessionId: 'session-1',
          status: 'failed',
          summary: 'Failed to repair the working-memory prompt after debug retry trace',
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
        outcome: 'Codex produced no semantic progress after retry=5; workbench trace=trace-failure',
        status: 'failed',
        summary: 'Failed to repair the working-memory prompt after debug retry trace',
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
    expect(workingMemoryText).not.toContain('respect_correction(')
    expect(workingMemoryText).toContain('不是这个，别再用旧模板了。')
    expect(workingMemoryText).not.toContain('carry_execution:')
    expect(workingMemoryText).not.toContain('execution_callback_status:failed')
    expect(workingMemoryText).not.toContain('Codex produced no semantic progress')
    expect(workingMemoryText).not.toContain('retry=5')
    expect(workingMemoryText).not.toContain('trace-failure')
    expect(context.workingMemory).not.toHaveProperty('audit')
    expect(context.workingMemory).not.toHaveProperty('longTermQueue')
    const providerText = result.messages
      .map(message => String(message.content ?? ''))
      .join('\n')
    expect(providerText).not.toContain('execution_callback_status:failed')
    expect(providerText).not.toContain('Codex produced no semantic progress')
    expect(providerText).not.toContain('retry=5')
    expect(providerText).not.toContain('trace-failure')
    expect(findAlicizationProviderFact(
      result.messages,
      'alicization-execution-callbacks',
    )).toBeNull()
    expect(result.memoryWriteItems).toEqual([])
  })

  it('keeps raw persisted turns in WorkingMemory but does not enqueue long-term writes without structured evidence', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn<WorkingMemoryLongTermQueueEnqueue>(async () => {})
    const drainWorkingMemoryLongTermQueue = vi.fn(async () => ({
      cleaned: 0,
      admitted: 0,
      applied: 0,
      rejected: 0,
      review: 0,
      failed: 0,
      pending: 0,
    }))
    const drainWorkingMemoryLongTermQueueScoped = vi.fn<WorkingMemoryLongTermQueueScopedDrain>(async input => ({
      cleaned: input.queueItemIds.length,
      admitted: input.queueItemIds.length,
      applied: input.queueItemIds.length,
      rejected: 0,
      review: 0,
      failed: 0,
      pending: 0,
      settlements: input.queueItemIds.map(queueItemId => ({
        queueItemId,
        transactionId: `transaction:${queueItemId}`,
        status: 'applied' as const,
        errorSummary: null,
      })),
    }))
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      drainWorkingMemoryLongTermQueue,
      drainWorkingMemoryLongTermQueueScoped,
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

    expect(findOnlyAlicizationTurnMemoryContextMessage(result.messages).message.content)
      .toBe(result.memoryContext.providerSystemBlock)
    expect(enqueueWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
    expect(drainWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
    expect(drainWorkingMemoryLongTermQueueScoped).not.toHaveBeenCalled()
    const workingMemorySnapshot = result.workingMemorySnapshot!
    expect(JSON.stringify(workingMemorySnapshot.recentRawTurns))
      .toContain('我不想要固定模板回复，我需要她数字生命自身的人格回复。')
    expect(workingMemorySnapshot.longTermCandidates).toEqual([])
    expect(workingMemorySnapshot.audit.excludedLongTermCandidateTurnIds)
      .toContain('turn-working-memory-provider-settled:user')
    expect(workingMemorySnapshot.audit.notes)
      .toContain('missing-structured-memory-evidence')

    const committed = await result.commitMemoryWriteIntent?.({
      assistantText: '我会从成功回复后再提交这条长期候选。',
    })

    expect(enqueueWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
    expect(drainWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
    expect(drainWorkingMemoryLongTermQueueScoped).not.toHaveBeenCalled()
    expect(committed?.ownerSettlements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        owner: 'long-term-memory-queue',
        status: 'skipped',
        reason: 'no-items',
      }),
      expect.objectContaining({
        owner: 'long-term-memory-drain',
        status: 'skipped',
        reason: 'no-items',
      }),
    ]))
  })

  it('settles Provider memory evidence into the WorkingMemory snapshot and long-term queue', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn<WorkingMemoryLongTermQueueEnqueue>(async () => {})
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      listConversationTurnsBySession: vi.fn(async () => []),
    })
    const messages: Message[] = [{
      role: 'user',
      content: '请记住我喜欢先说结论，再给必要细节。',
    }]

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-provider-memory-evidence',
        messages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages }),
    })

    expect(result.workingMemorySnapshot?.longTermCandidates).toEqual([])

    const intent = result.resolveMemoryWriteIntent?.({
      assistantText: '我会先说结论，再补充必要细节。',
      memoryEvidence: {
        version: 'provider-memory-evidence-v1',
        kind: 'preference',
        summary: '用户更喜欢先说结论，再给必要细节。',
        reason: '用户明确提出了稳定的回复顺序偏好。',
        evidenceSnippets: ['请记住我喜欢先说结论，再给必要细节。'],
        salience: 0.86,
        sensitivity: 'personal',
        confidence: 0.92,
      },
    })

    expect(intent).toEqual(expect.objectContaining({
      workingMemorySnapshot: expect.objectContaining({
        recentRawTurns: expect.arrayContaining([
          expect.objectContaining({
            turnId: 'turn-provider-memory-evidence:user',
            memoryEvidence: expect.objectContaining({
              source: 'explicit-structured-memory-evidence',
              kind: 'preference',
            }),
          }),
        ]),
        longTermCandidates: [
          expect.objectContaining({
            sourceTurnIds: ['turn-provider-memory-evidence:user'],
            kind: 'preference',
            summary: '用户更喜欢先说结论，再给必要细节。',
            allowTraining: false,
            memoryEvidence: expect.objectContaining({
              version: 'working-memory-long-term-evidence-v1',
            }),
          }),
        ],
      }),
      memoryWriteItems: [
        expect.objectContaining({
          sourceTurnIds: ['turn-provider-memory-evidence:user'],
          kind: 'preference',
          summary: '用户更喜欢先说结论，再给必要细节。',
          status: 'pending-cleaning',
          allowTraining: false,
        }),
      ],
    }))
    expect(enqueueWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
  })

  it('extracts an explicit memory request when a Provider returns ordinary text', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn<WorkingMemoryLongTermQueueEnqueue>(async () => {})
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      listConversationTurnsBySession: vi.fn(async () => []),
    })
    const messages: Message[] = [{
      role: 'user',
      content: '记住我喜欢蓝色',
    }]

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-plain-text-memory-evidence',
        messages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages }),
    })

    const intent = result.resolveMemoryWriteIntent?.({
      assistantText: '记住了。',
    })

    expect(intent?.workingMemorySnapshot.longTermCandidates).toEqual([
      expect.objectContaining({
        kind: 'preference',
        summary: '用户喜欢蓝色。',
        sourceTurnIds: ['turn-plain-text-memory-evidence:user'],
        memoryEvidence: expect.objectContaining({
          kind: 'preference',
          evidenceSnippets: ['记住我喜欢蓝色'],
        }),
      }),
    ])
    expect(intent?.memoryWriteItems).toEqual([
      expect.objectContaining({
        kind: 'preference',
        summary: '用户喜欢蓝色。',
        status: 'pending-cleaning',
      }),
    ])
  })

  it('does not report scoped long-term drain success when a current-turn queue item is missing', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn<WorkingMemoryLongTermQueueEnqueue>(async () => {})
    const drainWorkingMemoryLongTermQueue = vi.fn(async () => ({
      cleaned: 1,
      admitted: 1,
      applied: 1,
      rejected: 0,
      review: 0,
      failed: 0,
      pending: 0,
    }))
    const drainWorkingMemoryLongTermQueueScoped = vi.fn<WorkingMemoryLongTermQueueScopedDrain>(async input => ({
      cleaned: 0,
      admitted: 0,
      applied: 0,
      rejected: 0,
      review: 0,
      failed: 0,
      pending: 1,
      settlements: input.queueItemIds.map(queueItemId => ({
        queueItemId,
        transactionId: null,
        status: 'missing' as const,
        errorSummary: 'queue item was not found in the requested scope',
      })),
    }))
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      drainWorkingMemoryLongTermQueue,
      drainWorkingMemoryLongTermQueueScoped,
      listConversationTurnsBySession: vi.fn(async () => [{
        turnId: 'turn-working-memory-scoped-missing-source',
        sessionId: 'session-1',
        userText: '请记住我喜欢先说结论。',
        assistantText: '明白。',
        structuredJson: JSON.stringify({
          origin: 'provider',
          learningPolicy: {
            allowLongTermCondensation: true,
            allowPersonaLearning: true,
            allowTraining: false,
          },
          memoryEvidence: createWorkingMemoryLongTermEvidence({
            kind: 'preference',
            summary: 'The user prefers conclusions before supporting detail.',
            reason: 'Reviewed preference evidence.',
            evidenceSnippet: 'A reviewed memory action confirmed conclusion-first replies.',
          }),
        }),
        createdAt: 9,
      }]),
    })
    const messages: Message[] = [{
      role: 'user',
      content: '继续',
    }]
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-scoped-missing',
        messages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages }),
    })

    const committed = await result.commitMemoryWriteIntent?.({
      assistantText: '我会保留这个偏好。',
    })

    expect(drainWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
    expect(drainWorkingMemoryLongTermQueueScoped).toHaveBeenCalledOnce()
    expect(committed?.ownerSettlements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        owner: 'long-term-memory-drain',
        status: 'failed',
        errorSummary: expect.stringContaining('missing=1'),
      }),
    ]))
    expect(result.memoryFailures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        stage: 'working-memory-long-term-drain',
        errorSummary: expect.stringContaining('missing=1'),
      }),
    ]))
  })

  it('keeps persisted failure turns out of WorkingMemory and Provider context', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {})
    const workingMemoryStore = createWorkingMemoryStore()
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      workingMemoryStore,
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

    expect(workingMemoryStore.latest('default')).toBeNull()
    expect(JSON.stringify(result.workingMemorySnapshot))
      .not
      .toContain('我喜欢先说结论，再给必要细节。')
    expect(JSON.stringify(result.workingMemorySnapshot))
      .not
      .toContain('Provider 鉴权失败')
    expect(result.memoryContext.providerSystemBlock)
      .not
      .toContain('我喜欢先说结论，再给必要细节。')
    expect(result.memoryContext.providerSystemBlock)
      .not
      .toContain('Provider 鉴权失败')
    expect(enqueueWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
  })

  it('keeps hidden memory side-failure rows out of WorkingMemory', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {})
    const workingMemoryStore = createWorkingMemoryStore()
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      workingMemoryStore,
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

    expect(workingMemoryStore.latest('default')).toBeNull()
    expect(JSON.stringify(result.workingMemorySnapshot))
      .not
      .toContain('vector recall offline')
    expect(result.memoryContext.providerSystemBlock)
      .not
      .toContain('vector recall offline')
    expect(enqueueWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
  })

  it('reports long-term queue persistence failure without turning it into learned dialogue', async () => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {
      throw new Error('queue write failed')
    })
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
        userText: '我喜欢先说结论，再给必要细节。',
        assistantText: '明白。',
        structuredJson: JSON.stringify({
          origin: 'provider',
          learningPolicy: {
            allowLongTermCondensation: true,
            allowPersonaLearning: true,
            allowTraining: false,
          },
          memoryEvidence: createWorkingMemoryLongTermEvidence({
            kind: 'preference',
            summary: 'The user prefers conclusions before supporting detail.',
            reason: 'Reviewed preference evidence.',
            evidenceSnippet: 'A reviewed memory action confirmed conclusion-first replies.',
          }),
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
    const committed = await result.commitMemoryWriteIntent?.({
      assistantText: '这轮已经成功，但长期队列写入失败。',
    })

    expect(drainWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
    expect(committed?.ownerSettlements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        owner: 'long-term-memory-queue',
        status: 'failed',
        errorSummary: 'queue write failed',
      }),
      expect.objectContaining({
        owner: 'long-term-memory-drain',
        status: 'skipped',
        reason: 'queue-enqueue-failed',
      }),
    ]))
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

  it.each(['failed', 'dead-lettered'] as const)('reports %s long-term drain work as a partial owner failure', async (status) => {
    const enqueueWorkingMemoryLongTermQueue = vi.fn<WorkingMemoryLongTermQueueEnqueue>(async () => {})
    const drainWorkingMemoryLongTermQueue = vi.fn(async () => ({
      cleaned: 0,
      admitted: 0,
      applied: 0,
      rejected: 0,
      review: 0,
      failed: 0,
      pending: 0,
    }))
    const drainWorkingMemoryLongTermQueueScoped = vi.fn<WorkingMemoryLongTermQueueScopedDrain>(async input => ({
      cleaned: input.queueItemIds.length,
      admitted: 0,
      applied: 0,
      rejected: 0,
      review: 0,
      failed: input.queueItemIds.length,
      pending: 0,
      settlements: input.queueItemIds.map(queueItemId => ({
        queueItemId,
        transactionId: `transaction:${queueItemId}`,
        status,
        errorSummary: 'projection failed',
      })),
    }))
    const { runtime } = createWorkingMemoryRuntimeFixture({
      enqueueWorkingMemoryLongTermQueue,
      drainWorkingMemoryLongTermQueue,
      drainWorkingMemoryLongTermQueueScoped,
      listConversationTurnsBySession: vi.fn(async () => [{
        turnId: 'turn-working-memory-drain-source',
        sessionId: 'session-1',
        userText: '请记住我更喜欢先说结论。',
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
    const messages: Message[] = [{
      role: 'user',
      content: '继续',
    }]
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-drain-partial',
        messages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages }),
    })

    const settledIntent = result.resolveMemoryWriteIntent?.({
      assistantText: '这轮成功，但其中一条长期候选清洗失败。',
    })
    expect(settledIntent).toBeDefined()
    settledIntent!.memoryWriteItems = [{
      id: 'queue-drain-partial',
      sourceTurnIds: ['turn-working-memory-drain-source:user'],
      kind: 'preference',
      summary: '用户更喜欢先说结论。',
      reason: 'candidate:preference',
      evidenceSnippets: ['请记住我更喜欢先说结论。'],
      salience: 0.8,
      confidence: 0.86,
      sensitivity: 'personal',
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: 100,
      source: 'working-memory-owner',
    }]
    const committed = await result.commitMemoryWriteIntent?.({
      assistantText: '这轮成功，但其中一条长期候选清洗失败。',
      intent: settledIntent,
    })

    expect(drainWorkingMemoryLongTermQueue).not.toHaveBeenCalled()
    expect(drainWorkingMemoryLongTermQueueScoped).toHaveBeenCalledWith({
      cardId: 'default',
      sessionId: expect.any(String),
      queueItemIds: ['queue-drain-partial'],
    })
    expect(committed?.ownerSettlements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        owner: 'long-term-memory-queue',
        status: 'succeeded',
      }),
      expect.objectContaining({
        owner: 'long-term-memory-drain',
        status: 'failed',
        errorSummary: expect.stringContaining('failed=1'),
      }),
    ]))
    expect(result.memoryFailures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-persistence',
        stage: 'working-memory-long-term-drain',
        errorSummary: expect.stringContaining('failed=1'),
      }),
    ]))
  })

  it('isolates autobiographical and persona-learning failures after WorkingMemory commits', async () => {
    const workingMemoryStore = createWorkingMemoryStore()
    const persistWorkingMemoryCheckpoint = vi.fn(async () => {})
    const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {})
    const persistAutobiographicalEpisodesFromPreparedMirror = vi.fn(async () => {
      throw new Error('autobiographical store offline')
    })
    const scheduleOrganicLearningAction = vi.fn(async () => {
      throw new Error('persona learning scheduler offline')
    })
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore,
      persistWorkingMemoryCheckpoint,
      enqueueWorkingMemoryLongTermQueue,
      persistAutobiographicalEpisodesFromPreparedMirror,
      scheduleOrganicLearningAction,
      listConversationTurnsBySession: vi.fn(async () => [{
        turnId: 'turn-memory-owner-side-failures-evidence',
        sessionId: 'session-1',
        userText: '短期上下文仍由 WorkingMemory 保留。',
        assistantText: '明白。',
        structuredJson: JSON.stringify({
          origin: 'provider',
          learningPolicy: {
            allowLongTermCondensation: true,
            allowPersonaLearning: true,
            allowTraining: false,
          },
          memoryEvidence: createWorkingMemoryLongTermEvidence({
            kind: 'preference',
            summary: 'The user prefers conclusions before supporting detail.',
            reason: 'Reviewed preference evidence.',
            evidenceSnippet: 'A reviewed memory action confirmed conclusion-first replies.',
          }),
        }),
        createdAt: 9,
      }]),
    })
    const messages: Message[] = [{
      role: 'user',
      content: '请记住我喜欢先说结论。',
    }]
    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-memory-owner-side-failures',
        messages,
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({ messages }),
    })

    const committed = await result.commitMemoryWriteIntent?.({
      assistantText: '我会先说结论。',
    })

    expect(committed).toEqual(expect.objectContaining({
      workingMemorySnapshot: expect.objectContaining({
        cardId: 'default',
      }),
      ownerSettlements: expect.arrayContaining([
        expect.objectContaining({
          owner: 'working-memory-store',
          status: 'succeeded',
        }),
        expect.objectContaining({
          owner: 'working-memory-checkpoint',
          status: 'succeeded',
        }),
        expect.objectContaining({
          owner: 'long-term-memory-queue',
          status: 'succeeded',
        }),
        expect.objectContaining({
          owner: 'autobiographical-memory',
          status: 'failed',
          errorSummary: 'autobiographical store offline',
        }),
        expect.objectContaining({
          owner: 'persona-learning',
          status: 'failed',
          errorSummary: 'persona learning scheduler offline',
        }),
      ]),
    }))

    expect(workingMemoryStore.latest('default')).not.toBeNull()
    expect(persistWorkingMemoryCheckpoint).toHaveBeenCalledOnce()
    expect(enqueueWorkingMemoryLongTermQueue).toHaveBeenCalledOnce()
    expect(result.memoryFailures).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-persistence',
        stage: 'autobiographical-memory-write',
        errorSummary: 'autobiographical store offline',
      }),
      expect.objectContaining({
        kind: 'memory-persistence',
        stage: 'persona-learning-schedule',
        errorSummary: 'persona learning scheduler offline',
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
        scope: {
          userId: 'user-1',
          cardId: 'default',
        },
        provenance: 'remembered' as const,
        evidenceVersion: 'long-term-memory-evidence-v1',
        version: 'long-term-memory-evidence-v1',
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
          id: 'episode-game-last-week',
          source: 'episodic_events',
        }),
      ],
    }))
    expect(result.memoryContext.availableLongTermEvidenceIds).toEqual(['episode-game-last-week'])
    expect(context.longTermRecall).toEqual(JSON.parse(result.memoryContext.providerSystemBlock).data.longTermRecall)
    expect(context.longTermRecall).not.toHaveProperty('intent')
    expect(context.longTermRecall).not.toHaveProperty('plan')
    expect(context.longTermRecall?.evidence[0]?.summary).toContain('Minecraft')
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
    expect(result.memoryContext.longTermRecall?.status).toBe('empty')
    expect(result.memoryContext.longTermRecall?.evidence).toEqual([])
    expect(context.longTermRecall?.status).toBe('empty')
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

  it('surfaces a missing LongTermMemoryRecall owner instead of silently treating recall as empty', async () => {
    const occurredAt = 1_710_000_000_000
    const { runtime } = createWorkingMemoryRuntimeFixture({
      getNow: () => occurredAt,
      retrieveLongTermMemoryEvidence: undefined,
    })
    const messages: Message[] = [{
      role: 'user',
      content: '你还记得我们上次做到哪里吗？',
    }]
    const prelude = createReflectivePrelude({ messages })

    const result = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-missing-long-term-memory-owner',
        messages,
        supportsTools: true,
      } as any,
      prelude,
    })

    expect(result.memoryContext.workingMemory.owner).toBe('working-memory')
    expect(result.memoryContext.longTermRecall?.status).toBe('empty')
    expect(result.memoryContext.longTermRecall?.evidence).toEqual([])
    expect(result.memoryFailures).toEqual([
      expect.objectContaining({
        kind: 'recall-failure',
        stage: 'long-term-memory-recall',
        cardId: 'default',
        turnId: 'turn-missing-long-term-memory-owner',
        occurredAt,
        errorSummary: 'LongTermMemoryRecall owner is unavailable.',
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      }),
    ])
  })

  it('replaces an existing typed memory context without dropping ordinary messages', async () => {
    const staleMemoryContext = JSON.stringify({
      type: 'alicization-turn-memory-context',
      data: {
        version: 'stale-memory-context',
        workingMemory: {
          owner: 'stale-owner',
        },
        longTermRecall: null,
      },
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

    const firstResult = await runtime.prepareExecution({
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
    await firstResult.commitMemoryWriteIntent?.({
      assistantText: '我会按你的纠正继续。',
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
    expect(workingMemoryText).not.toContain('respect_correction(')
    expect(workingMemoryText).toContain('不是这个，别再用旧模板了。')
    expect(context.workingMemory.current.currentUserMove).toBe('继续')
  })

  it('does not carry an uncommitted failed turn into the next successful memory settlement', async () => {
    const workingMemoryStore = createWorkingMemoryStore()
    let persistedCheckpoint = null as ReturnType<typeof createEmptyWorkingMemorySnapshot> | null
    const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {})
    const { runtime } = createWorkingMemoryRuntimeFixture({
      workingMemoryStore,
      getWorkingMemoryCheckpoint: vi.fn(async () => persistedCheckpoint),
      persistWorkingMemoryCheckpoint: vi.fn(async (snapshot) => {
        persistedCheckpoint = structuredClone(snapshot)
      }),
      enqueueWorkingMemoryLongTermQueue,
      listConversationTurnsBySession: vi.fn(async () => []),
    })
    const failedText = '我只喝极甜的咖啡，请永久记住。'
    const failedResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-failed',
        messages: [{
          role: 'user',
          content: failedText,
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: failedText,
        } as Message],
      }),
    })

    expect(JSON.stringify(failedResult.workingMemorySnapshot)).toContain(failedText)
    expect(workingMemoryStore.latest('default')).toBeNull()
    expect(persistedCheckpoint).toBeNull()
    expect(enqueueWorkingMemoryLongTermQueue).not.toHaveBeenCalled()

    const successfulResult = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-working-memory-success-after-failure',
        messages: [{
          role: 'user',
          content: '继续当前任务。',
        }],
        supportsTools: true,
      } as any,
      prelude: createReflectivePrelude({
        messages: [{
          role: 'user',
          content: '继续当前任务。',
        } as Message],
      }),
    })
    const providerContext = findOnlyAlicizationTurnMemoryContextMessage(
      successfulResult.messages,
    ).context

    expect(JSON.stringify(providerContext.workingMemory)).not.toContain(failedText)

    await successfulResult.commitMemoryWriteIntent?.({
      assistantText: '我会继续当前任务。',
    })

    expect(JSON.stringify(workingMemoryStore.latest('default'))).not.toContain(failedText)
    expect(JSON.stringify(persistedCheckpoint)).not.toContain(failedText)
    expect(JSON.stringify(enqueueWorkingMemoryLongTermQueue.mock.calls)).not.toContain(failedText)
  })

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
    expect(result.organicMemoryContext?.hostPersonModel?.preferredClosenessByContext[0]?.context).toBe('focused-work')
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    const runtimeMemory = reflectivePrelude.perceptionAugmentation.digitalLifeRuntimeSurface?.memory
    expect(runtimeMemory).toBeTruthy()
    ;(runtimeMemory as any).autobiographicalSelf = {
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

    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.relationshipDoctrine)
      .toContain('Repair before closeness')
    expect(result.organicMemoryContext?.selfEvolution ?? null).toBeNull()
  })

  it('keeps focused-work proactive style split by initialized persona while staying on the same task knot', async () => {
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
        buildMainRuntimeCorePromptBlocks: () => [],
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

    expect(direct.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.preferredProactiveStyle)
      .toBe('light-nudge')
    expect(observant.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection?.preferredProactiveStyle)
      .toBe('silent-observe')
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
      buildMainRuntimeCorePromptBlocks: () => [],
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

    expect(result.organicMemoryContext?.selfEvolution?.relationshipDoctrine).toContain('Leave more room')
    expect(result.organicMemoryContext?.selfEvolution?.nextLearningAction).toBe('internalize')
    expect(result.organicMemoryContext?.selfEvolution?.shouldInternalize).toBe(true)
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
      buildMainRuntimeCorePromptBlocks: () => [],
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

    expect(result.organicMemoryContext?.memoryDeliberation?.unsafeDetails).toEqual([
      'Do not assert which exact wording or day belonged to that old seam.',
    ])
    expect(result.memoryTurnArtifact?.competition.conflictSeverity).toBe('high')
    expect(result.memoryTurnArtifact?.deliberation).toMatchObject({
      stableCore: ['That period kept bending toward the runtime seam until it held together.'],
      unsafeDetails: ['Do not assert which exact wording or day belonged to that old seam.'],
    })
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation?.selectedEpisodes)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ provenance: 'dreamt' }),
      ]))
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation?.unsafeDetails)
      .toContain('Do not state the dream residue as a lived remembered fact.')
    expect(result.runtimeSurface.digitalLifeRuntimeSurface?.memory.recollectionSpeechPlan).toMatchObject({
      certainty: 'approximate',
      surfaceMode: 'answer-anchoring',
    })
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
      buildMainRuntimeCorePromptBlocks: () => [],
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
