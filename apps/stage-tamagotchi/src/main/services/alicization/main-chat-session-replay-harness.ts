import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationMindTurnGovernance,
  AlicizationSensoryCacheSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatPrelude } from './main-chat-session-runtime'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { createAlicizationAgentRuntime } from './agent-runtime'
import { createAlicizationMainChatSessionRuntime } from './main-chat-session-runtime'

const executionChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
] as const

function createSensorySnapshot() {
  return {
    running: true,
    stale: false,
    ageMs: 10,
    nextTickAt: 20,
    sample: {
      collectedAt: 10,
      time: {
        iso: '2026-04-22T00:00:00.000Z',
        local: '2026-04-22 08:00',
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
  } satisfies AlicizationSensoryCacheSnapshot
}

function createCapabilities(): AlicizationChannelCapability[] {
  return [
    { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
    { channel: 'codex', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    { channel: 'claude-code', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    { channel: 'openclaw', available: false, enabled: false, ready: false, sessionAffinity: true, reason: 'offline' },
  ]
}

function createBasePrelude(input: {
  messages: Message[]
  governance?: AlicizationMindTurnGovernance | null
}): AlicizationPreparedMainChatPrelude {
  return {
    actionObligation: {
      confidence: 0.62,
      kind: 'answer',
      routingIntent: null,
      source: 'dialogue-governance',
      reasonCodes: ['stay-on-thread'],
      summary: 'Stay on the same dialogue continuity line and answer directly.',
    },
    chatConfig: {
      id: 'chat-config',
    } as any,
    messages: input.messages,
    contextualStringPromise: Promise.resolve('recent contextual recall'),
    executionCallbackContextPromise: Promise.resolve({
      actions: [],
      callbacks: [],
      continuitySignals: [],
      recallText: '',
      systemBlock: '',
    }),
    executionLedgerContextPromise: Promise.resolve({
      entries: [],
      recallText: '',
      systemBlock: '',
    }),
    executionCapabilityInquiry: {
      active: false,
      capabilityQuestion: false,
      mentionedChannels: [] as const,
      hasActionVerb: false,
      hasCommandLiteral: false,
    },
    executionRoutingIntent: null,
    perceptionAugmentation: {
      messages: input.messages,
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
          autonomy: null,
        },
      },
      memoryRecallSeed: '',
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
        turnMode: input.governance?.turnMode ?? 'answer',
        personaKernelMode: input.governance?.personaKernelMode ?? 'full',
        mindTurnGovernance: input.governance ?? ({
          decisionTraceId: 'trace-replay',
          turnMode: 'answer',
          truthState: 'dialogue-grounded',
          liveSurface: null,
          answerAct: 'answer',
          evidenceMode: 'dialogue-grounded',
          repairState: 'none',
          personaKernelMode: 'full',
          openingStyle: 'direct-answer',
          relationshipPosture: 'warm',
          suppressAssociativeRecall: false,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 4,
          mustDo: [],
          mustNotDo: [],
        } as any),
      },
    },
  }
}

export interface AlicizationReplayTurn {
  turnId: string
  userText: string
  organicMemoryContext?: OrganicMemoryPromptContext
  prelude?: AlicizationPreparedMainChatPrelude
  messages?: Message[]
}

export async function replayMainChatSession(input: {
  turns: AlicizationReplayTurn[]
}) {
  let activeTurn: AlicizationReplayTurn | null = null
  const getSensorySnapshot = async () => createSensorySnapshot()
  const runtime = createAlicizationMainChatSessionRuntime({
    executionCapabilityChannels: executionChannels,
    buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
    buildOrganicMemorySystemBlocks: context => [
      context.memoryDeliberation ? '[ALICIZATION_MEMORY_DELIBERATION]' : '',
      context.recollectionSpeechPlan ? '[ALICIZATION_RECOLLECTION_SPEECH_PLAN]' : '',
    ].filter(Boolean),
    buildPerformanceManifestSystemBlocks: () => [],
    executeMainGatewayTaskThread: async () => ({
      ok: true,
      summary: 'noop',
    } as any),
    getPerformanceManifest: async () => null,
    getSensorySnapshot,
    latestUserMessageContainsVisualInput: () => false,
    openAgentTurn: async (turnInput) => {
      const agentRuntime = createAlicizationAgentRuntime({
        getSensorySnapshot,
        resolveConversationSessionId: async () => 'session-replay',
      })
      return await agentRuntime.openTurn(turnInput)
    },
    resolveCardCustomDirectives: async () => ({
      text: '',
      source: 'none',
    }),
    resolveCardHostName: async () => '',
    resolveCardPersonaKernel: async () => null,
    resolveExecutionCapabilitiesForPrompt: async () => createCapabilities(),
    resolveOrganicMemoryPromptContext: async () => activeTurn?.organicMemoryContext ?? {
      hostAttitude: '',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    },
    resolveSessionContinuitySignals: async () => [],
    resolveTaskPlanningCapabilities: async () => createCapabilities(),
    scheduleReminderTask: async () => ({ ok: true } as any),
    tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
    invokeMcpListTools: async () => ({ tools: [] }),
    invokeMcpCallTool: async () => ({ ok: true }),
  })

  const results = []
  for (const turn of input.turns) {
    activeTurn = turn
    const messages = turn.messages ?? [{
      role: 'user',
      content: turn.userText,
    } as Message]
    const prelude = turn.prelude ?? createBasePrelude({ messages })
    const prepared = await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: turn.turnId,
        messages,
        supportsTools: true,
      } as any,
      prelude,
    })
    results.push(prepared)
  }

  return results
}
