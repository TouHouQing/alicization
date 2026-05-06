import type {
  AlicizationChannelCapability,
  AlicizationExecutionCapabilityChannel,
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionRoutingIntent,
  AlicizationPersonaKernelSnapshot,
} from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatStartPayload,
  AlicizationMindTurnContractSnapshot,
  AlicizationMindTurnGovernance,
  AlicizationRecallGovernorSnapshot,
  AlicizationSensoryCacheSnapshot,
  AlicizationSensoryCaptureHealth,
  AlicizationSensoryCapturePermission,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionContinuityInput,
  AlicizationAgentTurnRuntime,
} from './agent-runtime'
import type {
  AlicizationDialogueSessionManager,
  AlicizationDialogueSessionMirror,
} from './dialogue-session-manager'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type {
  AlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import type { AlicizationMainChatActionObligation } from './main-chat-action-obligation'
import type { AlicizationMainChatExecutionReplyObligation } from './main-chat-execution-reply-obligation'
import type {
  BuildMainGatewayToolsOptions,
  MainGatewayExecutionToolContext,
} from './main-chat-execution-surface'
import type { AlicizationMainChatRuntimeSurface } from './main-chat-runtime-surface'
import type { AlicizationExecutionLedgerContext } from './memory-ledger-runtime'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import type { AlicizationTurnRetrievalPolicySnapshot } from './memory-accessibility-runtime'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  MainGatewayResolvedConfig,
  OrganicMemoryPromptContext,
  PreparedMainChatExecution,
  ResolvedCardCustomDirectives,
} from './runtime-soul'
import {
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import {
  emptyAlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import {
  buildAlicizationDialogueMemoryCarrySystemBlock,
  deriveAlicizationDialogueMemoryCarryPolicy,
} from './dialogue-memory-governor'
import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { buildMainChatActionObligationSystemBlock } from './main-chat-action-obligation'
import {
  applyMainChatExecutionReplyObligationToGovernance,
  buildMainChatExecutionReplyObligationSystemBlock,
  deriveMainChatExecutionReplyObligation,
} from './main-chat-execution-reply-obligation'
import {
  buildExecutionCapabilitySystemBlocks,
  buildExecutionRoutingEnforcementSystemBlock,
  buildMainGatewayExecutionRoutingToolChoice,
  buildMainGatewayTools,
} from './main-chat-execution-surface'
import {
  buildAlicizationMainChatRuntimeSurface,
  type AlicizationMainChatReplyAuthoritySurface,
  type AlicizationMainChatReplyExecutionPlanSurface,
  shouldUseDialogueFirstLivingPromptMode,
} from './main-chat-runtime-surface'
import { buildRecollectionSpeechVisibleSurfaceRules } from './response-surface-contract'
import { runOrganicLearningGovernor } from './runtime-learning-governor'
import { deriveRuntimeReplyAuthorityGovernance } from './runtime-reply-authority'
import {
  applyHostPersonModelToDigitalLifeRuntimeSurface,
  applyHostPersonModelToGovernance,
} from './runtime-host-person-model-reducer'
import { reduceRuntimeConsciousFrame } from './runtime-conscious-frame-reducer'
import { reduceRuntimeAnswerPlanner } from './runtime-answer-planner-reducer'
import {
  applyMemoryDeliberationToDigitalLifeRuntimeSurface,
  applyMemoryDeliberationToGovernance,
} from './runtime-memory-deliberation-reducer'
import {
  buildSessionContinuityRecallSeed,
  buildSessionMirrorRecollectionAfterthoughtSeed,
  deriveOrganicMemoryBudgetClass,
  filterMainGatewayToolsForRoutingIntent,
  mergeUniqueRules,
  sanitizeToolPhaseSegment,
} from './runtime-turn-composition'
import { buildAlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'
import { buildAlicizationTurnGraph, type AlicizationTurnGraph } from './turn-os/turn-graph'

export interface AlicizationMainChatPerceptionAugmentation {
  messages: Message[]
  systemBlocks: string[]
  promptSystemBlocks: string[]
  digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  memoryRecallSeed: string
  recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
  capture: {
    inspectionRequested: boolean
    groundedThisTurn: boolean
    snapshot: {
      degradedReasons: string[]
      health: AlicizationSensoryCaptureHealth
      permission: AlicizationSensoryCapturePermission
    } | null
    fallbackReason: string | null
  }
  chatGovernance: {
    suppressAssociativeRecall: boolean
    turnMode: AlicizationMindTurnGovernance['turnMode']
    personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
    mindTurnContract: AlicizationMindTurnContractSnapshot | null
    mindTurnGovernance: AlicizationMindTurnGovernance | null
  }
}

export interface AlicizationPreparedMainChatPrelude {
  actionObligation: AlicizationMainChatActionObligation
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  contextualStringPromise: Promise<string>
  executionCallbackContextPromise: Promise<AlicizationExecutionCallbackContext>
  executionLedgerContextPromise: Promise<AlicizationExecutionLedgerContext>
  executionCapabilityInquiry: AlicizationExecutionCapabilityInquiry
  executionRoutingIntent: AlicizationExecutionRoutingIntent | null
  perceptionAugmentation: AlicizationMainChatPerceptionAugmentation
}

export interface AlicizationPreparedMainChatExecutionResult extends PreparedMainChatExecution {
  conversationSessionId: string | null
  getSessionTrace: () => AlicizationRuntimeCallChainSnapshot
  mindTurnContract: AlicizationMindTurnContractSnapshot | null
  organicMemoryContext?: OrganicMemoryPromptContext
  memoryTurnArtifact?: ReturnType<typeof buildAlicizationMemoryTurnArtifact>
  personaKernel: AlicizationPersonaKernelSnapshot | null
  performanceManifest: CharacterPerformanceCapabilitiesManifest | null
  replyRealization: AlicizationMainChatReplyAuthoritySurface | null
  replyExecutionPlan: AlicizationMainChatReplyExecutionPlanSurface | null
  runtimeSurface: AlicizationMainChatRuntimeSurface
  sessionMirror: AlicizationDialogueSessionMirror | null
  sessionTrace: AlicizationRuntimeCallChainSnapshot
  turnGraph: AlicizationTurnGraph
}

interface CreateAlicizationMainChatSessionRuntimeOptions {
  buildMainRuntimeCorePromptBlocks: (input: {
    hostName: string
    personaKernel?: AlicizationPersonaKernelSnapshot | null
  }) => string[]
  buildOrganicMemorySystemBlocks: (
    context: OrganicMemoryPromptContext,
    memoryTurnArtifact?: ReturnType<typeof buildAlicizationMemoryTurnArtifact> | null,
  ) => string[]
  buildPerformanceManifestSystemBlocks: (manifest: CharacterPerformanceCapabilitiesManifest | null) => string[]
  dialogueSessionManager?: AlicizationDialogueSessionManager
  dialogueSessionMirrorTtlMs?: number
  persistAutobiographicalEpisodesFromPreparedMirror?: (input: {
    cardId: string
    decisionTraceId?: string | null
    turnId?: string | null
    sessionId: string
    previousMirror?: AlicizationDialogueSessionMirror | null
    mirror: AlicizationDialogueSessionMirror
  }) => Promise<void> | void
  executionCapabilityChannels: readonly AlicizationExecutionCapabilityChannel[]
  executeMainGatewayTaskThread: BuildMainGatewayToolsOptions['executeTaskThread']
  resumeMainGatewayTaskThread?: BuildMainGatewayToolsOptions['resumeTaskThread']
  getNow?: () => number
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot> | AlicizationSensoryCacheSnapshot
  latestUserMessageContainsVisualInput: (messages: Message[]) => boolean
  openAgentTurn: (input: {
    cardId: string
    decisionTraceId?: string | null
    turnId: string
  }) => Promise<AlicizationAgentTurnRuntime> | AlicizationAgentTurnRuntime
  resolveCardCustomDirectives: (cardId: string, input: { messages: Message[] }) => Promise<ResolvedCardCustomDirectives>
  resolveCardPersonaKernel: (cardId: string, input: { messages: Message[] }) => Promise<AlicizationPersonaKernelSnapshot | null>
  resolveCardHostName: (cardId: string, input: { messages: Message[] }) => Promise<string>
  resolveExecutionCapabilitiesForPrompt: () => Promise<AlicizationChannelCapability[]>
  resolveOrganicMemoryPromptContext: (input: {
    recallSeed: string
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) => Promise<OrganicMemoryPromptContext>
  scheduleOrganicLearningAction?: (input: {
    context: OrganicMemoryPromptContext
    turnId?: string | null
  }) => Promise<unknown>
  listMemoryReflections?: (cardId: string, limit?: number) => Promise<Array<{
    id: string
    summary: string
    lesson: string
    status: 'pending' | 'confirmed' | 'denied' | 'superseded'
  }>>
  listRelationshipOutcomes?: (cardId: string, limit?: number) => Promise<Array<{
    id: string
    summary: string
  }>>
  prewarmOrganicMemoryAccessibility?: (input: {
    recallSeed: string
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) => Promise<unknown>
  resolveTurnRetrievalPolicySnapshot?: (input: {
    recallSeed: string
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }) => Promise<AlicizationTurnRetrievalPolicySnapshot>
  resolveSessionContinuitySignals?: (input: {
    cardId: string
    turnId: string
  }) => Promise<AlicizationAgentSessionContinuityInput[]>
  resolveTaskPlanningCapabilities: BuildMainGatewayToolsOptions['resolveTaskPlanningCapabilities']
  scheduleReminderTask: BuildMainGatewayToolsOptions['scheduleReminderTask']
  tuneOrganicMemoryPromptContextForExecutiveTurn: (input: {
    context: OrganicMemoryPromptContext
    suppressAssociativeRecall: boolean
    personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
  }) => OrganicMemoryPromptContext
  invokeMcpCallTool: BuildMainGatewayToolsOptions['invokeMcpCallTool']
  invokeMcpListTools: BuildMainGatewayToolsOptions['invokeMcpListTools']
}

function normalizeSessionPhases(phases: string[]) {
  return [...new Set(phases.map(phase => phase.trim()).filter(Boolean))]
}

export function createAlicizationMainChatSessionRuntime(options: CreateAlicizationMainChatSessionRuntimeOptions) {
  const getNow = options.getNow ?? Date.now
  const dialogueSessionManager = options.dialogueSessionManager
    ?? createAlicizationDialogueSessionManager({
      getNow: options.getNow,
      staleAfterMs: options.dialogueSessionMirrorTtlMs,
    })

  async function prepareExecution(input: {
    payload: AlicizationChatStartPayload
    prelude: AlicizationPreparedMainChatPrelude
  }): Promise<AlicizationPreparedMainChatExecutionResult> {
    const { payload, prelude } = input
    const now = getNow()
    const effectiveExecutionRoutingIntent = prelude.actionObligation.routingIntent ?? prelude.executionRoutingIntent
    const routingRequired = Boolean(effectiveExecutionRoutingIntent)
    const digitalLifeSpine = prelude.perceptionAugmentation.digitalLifeRuntimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(prelude.perceptionAugmentation.digitalLifeRuntimeSurface)
      : null
    const digitalLifeArchitecture = digitalLifeSpine?.architecture ?? null
    const agentTurn = await options.openAgentTurn({
      cardId: payload.cardId,
      turnId: payload.turnId,
      decisionTraceId: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.decisionTraceId ?? null,
    })
    let messages = prelude.messages

    agentTurn.ingestDigitalLifeSpine(digitalLifeSpine)
    agentTurn.ingestDigitalLifeArchitecture(digitalLifeArchitecture)
    const previousSessionMirror = agentTurn.conversationSessionId
      ? dialogueSessionManager.getSessionMirror(payload.cardId, agentTurn.conversationSessionId)
      : null
    const memoryCarryPolicy = deriveAlicizationDialogueMemoryCarryPolicy({
      now,
      mirror: previousSessionMirror
        ? {
            memorySummary: previousSessionMirror.memorySummary,
            updatedAt: previousSessionMirror.updatedAt,
          }
        : null,
      mirrorStaleAfterMs: options.dialogueSessionMirrorTtlMs,
      spine: digitalLifeSpine,
    })
    const memoryCarrySystemBlock = buildAlicizationDialogueMemoryCarrySystemBlock(memoryCarryPolicy)

    const provisionalHasVisualGrounding = !effectiveExecutionRoutingIntent && options.latestUserMessageContainsVisualInput(messages)
    const dialogueFirstLeanRuntimeBase = shouldUseDialogueFirstLivingPromptMode({
      actionObligation: prelude.actionObligation ?? null,
      capture: {
        inspectionRequested: prelude.perceptionAugmentation.capture.inspectionRequested,
        groundedThisTurn: prelude.perceptionAugmentation.capture.groundedThisTurn,
        health: prelude.perceptionAugmentation.capture.snapshot?.health ?? null,
        permission: prelude.perceptionAugmentation.capture.snapshot?.permission ?? null,
        fallbackReason: prelude.perceptionAugmentation.capture.fallbackReason,
        degradedReasons: prelude.perceptionAugmentation.capture.snapshot?.degradedReasons ?? [],
      },
      governance: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance ?? null,
      hasVisualGrounding: provisionalHasVisualGrounding,
    })
    const dialogueFirstLeanRuntime = dialogueFirstLeanRuntimeBase
      && payload.waitForTools !== true
      && !routingRequired
    const skipExecutionPhaseTracking = dialogueFirstLeanRuntime && !routingRequired
    const [contextualString, executionCallbackContext, executionLedgerContext, sessionContinuitySignals] = await Promise.all([
      agentTurn.trackPhase('contextual-memory', async () => await prelude.contextualStringPromise, {
        turnId: payload.turnId,
      }),
      skipExecutionPhaseTracking
        ? prelude.executionCallbackContextPromise.then((context) => {
            agentTurn.ingestContinuitySignals(context.continuitySignals)
            agentTurn.ingestRuntimeActions(context.actions)
            return context
          }).catch(() => emptyAlicizationExecutionCallbackContext)
        : agentTurn.trackPhase('execution-callbacks', async () => {
            const context = await prelude.executionCallbackContextPromise
            agentTurn.ingestContinuitySignals(context.continuitySignals)
            agentTurn.ingestRuntimeActions(context.actions)
            return context
          }, {
            sessionId: agentTurn.conversationSessionId,
          }),
      skipExecutionPhaseTracking
        ? prelude.executionLedgerContextPromise.catch(() => emptyAlicizationExecutionLedgerContext)
        : agentTurn.trackPhase('execution-ledger', async () => await prelude.executionLedgerContextPromise, {
            routingRequired,
          }),
      agentTurn.trackPhase('session-continuity', async () => {
        const signals = await options.resolveSessionContinuitySignals?.({
          cardId: payload.cardId,
          turnId: payload.turnId,
        }) ?? []
        const digitalLifeSignal = digitalLifeSpine?.continuitySignal ?? null
        const mergedSignals = digitalLifeSignal
          ? [...signals, digitalLifeSignal]
          : signals
        agentTurn.ingestContinuitySignals(mergedSignals)
        return mergedSignals
      }, {
        cardId: payload.cardId,
      }),
      agentTurn.trackPhase('agent-session-context', async () => await agentTurn.getSensorySnapshot(), {
        cardId: payload.cardId,
      }),
    ])

    const organicRecallSeed = [
      contextualString,
      executionCallbackContext.recallText,
      executionLedgerContext.recallText,
      prelude.perceptionAugmentation.memoryRecallSeed,
      memoryCarryPolicy.recallSeed,
      buildSessionContinuityRecallSeed(sessionContinuitySignals ?? []),
      buildSessionMirrorRecollectionAfterthoughtSeed(previousSessionMirror),
    ].filter(Boolean).join('\n')
    const organicMemoryBudgetClass = deriveOrganicMemoryBudgetClass(
      prelude.perceptionAugmentation.recallGovernor,
    )
    const organicMemoryRetrievalPolicySnapshot = options.resolveTurnRetrievalPolicySnapshot
      ? await agentTurn.trackPhase('organic-memory-policy-snapshot', async () => await options.resolveTurnRetrievalPolicySnapshot?.({
          recallSeed: organicRecallSeed,
          recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          budgetClass: organicMemoryBudgetClass,
        }) ?? null, {
          budgetClass: organicMemoryBudgetClass,
        })
      : null
    if (options.prewarmOrganicMemoryAccessibility) {
      await agentTurn.trackPhase('organic-memory-prewarm', async () => {
        await options.prewarmOrganicMemoryAccessibility?.({
          recallSeed: organicRecallSeed,
          recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          turnId: payload.turnId,
          budgetClass: organicMemoryRetrievalPolicySnapshot?.plan.budgetClass ?? organicMemoryBudgetClass,
          retrievalPolicySnapshot: organicMemoryRetrievalPolicySnapshot,
        })
      }, {
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
      })
    }

    const organicMemoryContextStartedAt = getNow()
    const organicPromptContext = await agentTurn.trackPhase('organic-memory-context', async () => {
      return options.tuneOrganicMemoryPromptContextForExecutiveTurn({
        context: await options.resolveOrganicMemoryPromptContext({
          recallSeed: organicRecallSeed,
          recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          turnId: payload.turnId,
          budgetClass: organicMemoryRetrievalPolicySnapshot?.plan.budgetClass ?? organicMemoryBudgetClass,
          retrievalPolicySnapshot: organicMemoryRetrievalPolicySnapshot,
        }),
        suppressAssociativeRecall: prelude.perceptionAugmentation.chatGovernance.suppressAssociativeRecall,
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
        recallGovernor: prelude.perceptionAugmentation.recallGovernor,
      })
    }, {
      personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
      suppressAssociativeRecall: prelude.perceptionAugmentation.chatGovernance.suppressAssociativeRecall,
    })
    const memoryTurnArtifact = buildAlicizationMemoryTurnArtifact({
      context: organicPromptContext,
      retrievalPolicySnapshot: organicMemoryRetrievalPolicySnapshot,
      latencyMs: getNow() - organicMemoryContextStartedAt,
    })
    await runOrganicLearningGovernor({
      agentTurn,
      cardId: payload.cardId,
      turnId: payload.turnId,
      personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
      organicPromptContext,
      scheduleOrganicLearningAction: options.scheduleOrganicLearningAction,
      listMemoryReflections: options.listMemoryReflections,
      listRelationshipOutcomes: options.listRelationshipOutcomes,
    })
    const executionReplyObligation: AlicizationMainChatExecutionReplyObligation | null = deriveMainChatExecutionReplyObligation({
      messages: payload.messages as Message[],
      callbackContext: executionCallbackContext,
      ledgerContext: executionLedgerContext,
    })
    const {
      effectiveMindTurnGovernanceWithRecollection,
      llmMindAuthorityGovernance,
    } = deriveRuntimeReplyAuthorityGovernance({
      now,
      governance: applyMainChatExecutionReplyObligationToGovernance(
        prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance,
        executionReplyObligation,
      ),
      context: organicPromptContext,
      memoryTurnArtifact,
      applyMemoryDeliberationToGovernance,
      applyHostPersonModelToGovernance,
      applyRecollectionSurfaceRules: (governance) => {
        const recollectionSpeechVisibleSurfaceRules = buildRecollectionSpeechVisibleSurfaceRules(
          organicPromptContext.recollectionSpeechPlan ?? null,
        )
        return governance
          ? {
              ...governance,
              mustDo: mergeUniqueRules([
                ...recollectionSpeechVisibleSurfaceRules.mustDo,
                ...(governance.mustDo ?? []),
              ]),
              mustNotDo: mergeUniqueRules([
                ...recollectionSpeechVisibleSurfaceRules.mustNotDo,
                ...(governance.mustNotDo ?? []),
              ]),
            }
          : governance
      },
    })

    // NOTICE: Execution-routing intents are execution-governed turns. Do not allow
    // renderer payload flags to silently downgrade them into tool-disabled responses.
    const allowTools = dialogueFirstLeanRuntime
      ? false
      : (payload.supportsTools !== false || routingRequired)
    const waitForTools = dialogueFirstLeanRuntime
      ? false
      : (payload.waitForTools === true || routingRequired)
    const toolChoice = !dialogueFirstLeanRuntime && allowTools && effectiveExecutionRoutingIntent
      ? buildMainGatewayExecutionRoutingToolChoice(effectiveExecutionRoutingIntent)
      : undefined

    const sessionBoundToolOptions: Pick<BuildMainGatewayToolsOptions, 'executeTaskThread'
      | 'resumeTaskThread'
      | 'buildExecutionRuntimeContext'
      | 'getSensorySnapshot'
      | 'invokeMcpCallTool'
      | 'invokeMcpListTools'
      | 'resolveTaskPlanningCapabilities'
      | 'scheduleReminderTask'> = {
      buildExecutionRuntimeContext: async (toolContext) => {
        return await agentTurn.buildExecutionRuntimeContext({
          cardId: toolContext.cardId,
          turnId: toolContext.turnId,
          decisionTraceId: toolContext.decisionTraceId ?? null,
          sessionId: toolContext.sessionId ?? agentTurn.conversationSessionId,
        })
      },
      executeTaskThread: async (nextInput) => {
        const phaseSuffix = sanitizeToolPhaseSegment(nextInput.task.requestedChannel ?? nextInput.task.kind)
        return await agentTurn.trackTool({
          phaseId: `tool:executor:${phaseSuffix || 'dispatch'}`,
          kind: 'executor',
          label: `executor:${nextInput.task.requestedChannel ?? nextInput.task.kind}`,
          metadata: {
            requestedChannel: nextInput.task.requestedChannel,
            kind: nextInput.task.kind,
          },
          traceMetadata: {
            turnId: nextInput.context.turnId,
            requestedChannel: nextInput.task.requestedChannel,
            kind: nextInput.task.kind,
          },
          run: async () => await options.executeMainGatewayTaskThread(nextInput),
          summarizeSuccess: result => result.summary,
        })
      },
      resumeTaskThread: async (nextInput: { context: MainGatewayExecutionToolContext, threadId: string }) => {
        const phaseSuffix = sanitizeToolPhaseSegment(nextInput.threadId)
        if (!options.resumeMainGatewayTaskThread)
          throw new Error('resumeMainGatewayTaskThread is not configured.')
        return await agentTurn.trackTool({
          phaseId: `tool:executor-resume:${phaseSuffix || 'thread'}`,
          kind: 'executor',
          label: 'executor:resume-thread',
          metadata: {
            threadId: nextInput.threadId,
          },
          traceMetadata: {
            turnId: nextInput.context.turnId,
            threadId: nextInput.threadId,
          },
          run: async () => await options.resumeMainGatewayTaskThread!(nextInput),
          summarizeSuccess: result => result.summary,
        })
      },
      getSensorySnapshot: async () => {
        return await agentTurn.trackTool({
          phaseId: 'tool:sensory-capture-state',
          kind: 'sensory',
          label: 'sensory_capture_state',
          traceMetadata: {
            cardId: payload.cardId,
          },
          run: async () => await agentTurn.getSensorySnapshot({
            forceRefresh: true,
          }),
          summarizeSuccess: snapshot => [
            `foreground=${snapshot.sample.foregroundWindow?.appName ?? snapshot.sample.foregroundWindow?.processName ?? 'unknown'}`,
            `capture=${snapshot.capture?.health ?? 'unknown'}/${snapshot.capture?.permission ?? 'unknown'}`,
            `stale=${snapshot.stale === true ? 'true' : 'false'}`,
          ].join(' '),
        })
      },
      invokeMcpCallTool: async (nextPayload) => {
        const phaseSuffix = sanitizeToolPhaseSegment(nextPayload.name)
        return await agentTurn.trackTool({
          phaseId: `tool:mcp-call:${phaseSuffix || 'unknown'}`,
          kind: 'mcp',
          label: `mcp:${nextPayload.name}`,
          metadata: {
            cardId: nextPayload.cardId ?? payload.cardId,
            toolName: nextPayload.name,
          },
          traceMetadata: {
            cardId: nextPayload.cardId ?? payload.cardId,
            toolName: nextPayload.name,
          },
          run: async () => await options.invokeMcpCallTool(nextPayload),
          summarizeSuccess: () => `mcp tool ${nextPayload.name} completed`,
        })
      },
      invokeMcpListTools: async () => {
        return await agentTurn.trackTool({
          phaseId: 'tool:mcp-list-tools',
          kind: 'mcp',
          label: 'mcp_list_tools',
          traceMetadata: {
            cardId: payload.cardId,
          },
          run: async () => await options.invokeMcpListTools(),
          summarizeSuccess: () => 'listed available MCP tools',
        })
      },
      resolveTaskPlanningCapabilities: async () => {
        return await agentTurn.trackPhase('tool:executor-capability-snapshot', async () => await options.resolveTaskPlanningCapabilities(), {
          cardId: payload.cardId,
        })
      },
      scheduleReminderTask: async (cardId, nextPayload, source) => {
        return await agentTurn.trackTool({
          phaseId: 'tool:set-reminder',
          kind: 'runtime',
          label: 'set_reminder',
          metadata: {
            cardId,
            minutes: nextPayload.minutes,
          },
          traceMetadata: {
            cardId,
            minutes: nextPayload.minutes,
          },
          run: async () => await options.scheduleReminderTask(cardId, nextPayload, source),
          summarizeSuccess: () => `scheduled reminder in ${nextPayload.minutes} minutes`,
        })
      },
    }

    const [performanceManifest, customDirectivesResolution, hostName, personaKernel, builtTools, executionCapabilities] = await Promise.all([
      dialogueFirstLeanRuntime
        ? Promise.resolve(null)
        : agentTurn.trackPhase('performance-manifest', async () => await options.getPerformanceManifest(), {
            cardId: payload.cardId,
          }),
      agentTurn.trackPhase('card-directives', async () => await options.resolveCardCustomDirectives(payload.cardId, { messages }), {
        cardId: payload.cardId,
      }),
      agentTurn.trackPhase('host-name', async () => await options.resolveCardHostName(payload.cardId, { messages }), {
        cardId: payload.cardId,
      }),
      agentTurn.trackPhase('persona-kernel', async () => await options.resolveCardPersonaKernel(payload.cardId, { messages }), {
        cardId: payload.cardId,
      }),
      allowTools
        ? agentTurn.trackPhase('tool-registry', async () => await buildMainGatewayTools({
            context: {
              cardId: payload.cardId,
              turnId: payload.turnId,
              decisionTraceId: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.decisionTraceId ?? null,
              sessionId: agentTurn.conversationSessionId,
            },
            buildExecutionRuntimeContext: sessionBoundToolOptions.buildExecutionRuntimeContext,
            executeTaskThread: sessionBoundToolOptions.executeTaskThread,
            resumeTaskThread: sessionBoundToolOptions.resumeTaskThread,
            executionCapabilityChannels: options.executionCapabilityChannels,
            getSensorySnapshot: sessionBoundToolOptions.getSensorySnapshot,
            resolveTaskPlanningCapabilities: sessionBoundToolOptions.resolveTaskPlanningCapabilities,
            scheduleReminderTask: sessionBoundToolOptions.scheduleReminderTask,
            invokeMcpListTools: sessionBoundToolOptions.invokeMcpListTools,
            invokeMcpCallTool: sessionBoundToolOptions.invokeMcpCallTool,
          }), {
            routingRequired,
          })
        : Promise.resolve(undefined),
      dialogueFirstLeanRuntime
        ? Promise.resolve([])
        : agentTurn.trackPhase('execution-capabilities', async () => await options.resolveExecutionCapabilitiesForPrompt(), {
            inquiryActive: prelude.executionCapabilityInquiry.active,
          }),
    ])
    const tools = filterMainGatewayToolsForRoutingIntent(builtTools, effectiveExecutionRoutingIntent)

    const runtimeCorePromptBlocks = options.buildMainRuntimeCorePromptBlocks({
      hostName,
      personaKernel,
    })
    const hasVisualGrounding = provisionalHasVisualGrounding
    const sessionPhases = normalizeSessionPhases([
      ...agentTurn.snapshot().phaseOrder,
      'runtime-surface',
    ])
    const sessionMirrorSystemBlock = agentTurn.conversationSessionId
      ? dialogueSessionManager.buildSessionMirrorSystemBlock({
          cardId: payload.cardId,
          sessionId: agentTurn.conversationSessionId,
        })
      : ''
    const effectiveDigitalLifeRuntimeSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: digitalLifeSpine?.runtimeSurface ?? prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      governance: effectiveMindTurnGovernanceWithRecollection,
      context: organicPromptContext,
      now,
    })
    const sociallyShapedDigitalLifeRuntimeSurface = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface: effectiveDigitalLifeRuntimeSurface,
      governance: effectiveMindTurnGovernanceWithRecollection,
      context: organicPromptContext,
      now,
    })
    const consciousFrameReducedRuntimeSurface = reduceRuntimeConsciousFrame({
      surface: sociallyShapedDigitalLifeRuntimeSurface,
      governance: effectiveMindTurnGovernanceWithRecollection,
      now,
    })
    const answerPlannerReducedRuntimeSurface = reduceRuntimeAnswerPlanner({
      surface: consciousFrameReducedRuntimeSurface,
      governance: effectiveMindTurnGovernanceWithRecollection,
      now,
    })
    const effectiveDigitalLifeSpine = digitalLifeSpine
      ? {
          ...digitalLifeSpine,
          runtimeSurface: answerPlannerReducedRuntimeSurface ?? digitalLifeSpine.runtimeSurface,
        }
      : digitalLifeSpine

    const runtimeSurface = await agentTurn.trackPhase('runtime-surface', async () => {
      return buildAlicizationMainChatRuntimeSurface({
        actionObligation: prelude.actionObligation,
        actionObligationSystemBlock: buildMainChatActionObligationSystemBlock(prelude.actionObligation),
        allowTools,
        waitForTools,
        baseMessages: messages,
        hasVisualGrounding,
        runtimeCorePromptBlocks,
        digitalLifeSpine: effectiveDigitalLifeSpine,
        digitalLifeArchitecture,
        perceptionPromptSystemBlocks: prelude.perceptionAugmentation.promptSystemBlocks,
        perceptionSystemBlocks: prelude.perceptionAugmentation.systemBlocks,
        digitalLifeRuntimeSurface: answerPlannerReducedRuntimeSurface,
        executionCapabilitySystemBlocks: buildExecutionCapabilitySystemBlocks(
          executionCapabilities,
          options.executionCapabilityChannels,
          {
            allowTools,
            inquiry: prelude.executionCapabilityInquiry,
          },
        ),
        executionRoutingEnforcementSystemBlock: effectiveExecutionRoutingIntent
          ? buildExecutionRoutingEnforcementSystemBlock(effectiveExecutionRoutingIntent)
          : undefined,
        executionCallbackSystemBlocks: (!dialogueFirstLeanRuntime || Boolean(executionReplyObligation)) && executionCallbackContext.systemBlock
          ? [executionCallbackContext.systemBlock]
          : [],
        executionLedgerSystemBlocks: executionLedgerContext.systemBlock
          ? [executionLedgerContext.systemBlock]
          : [],
        executionReplyObligationSystemBlock: executionReplyObligation
          ? buildMainChatExecutionReplyObligationSystemBlock(executionReplyObligation)
          : undefined,
        agentRuntimeSystemBlocks: [
          memoryCarrySystemBlock,
          sessionMirrorSystemBlock,
          agentTurn.buildSessionSystemBlock(),
        ],
        organicMemorySystemBlocks: options.buildOrganicMemorySystemBlocks(organicPromptContext, memoryTurnArtifact),
        performanceManifestSystemBlocks: options.buildPerformanceManifestSystemBlocks(performanceManifest),
        customDirectivesResolution,
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
        personaKernelReason: prelude.perceptionAugmentation.chatGovernance.personaKernelMode === 'muted'
          ? 'truth-or-repair-obligation'
          : prelude.perceptionAugmentation.chatGovernance.personaKernelMode === 'backgrounded'
            ? 'task-or-direct-answer-obligation'
            : undefined,
        turnMode: prelude.perceptionAugmentation.chatGovernance.turnMode,
        governance: llmMindAuthorityGovernance,
        tools,
        toolChoice,
        sessionPhases,
        capture: {
          inspectionRequested: prelude.perceptionAugmentation.capture.inspectionRequested,
          groundedThisTurn: prelude.perceptionAugmentation.capture.groundedThisTurn,
          health: prelude.perceptionAugmentation.capture.snapshot?.health ?? null,
          permission: prelude.perceptionAugmentation.capture.snapshot?.permission ?? null,
          fallbackReason: prelude.perceptionAugmentation.capture.fallbackReason,
          degradedReasons: prelude.perceptionAugmentation.capture.snapshot?.degradedReasons ?? [],
        },
      })
    }, {
      hasVisualGrounding,
      routingRequired,
      sessionPhases: sessionPhases.join(' -> '),
    })
    messages = runtimeSurface.messages

    const sessionMirror = agentTurn.conversationSessionId
      ? dialogueSessionManager.ingestPreparedExecution({
        agentSession: agentTurn.getSessionSnapshot(),
        cardId: payload.cardId,
        organicMemoryContext: organicPromptContext,
        runtimeSurface,
        sessionId: agentTurn.conversationSessionId,
      })
      : previousSessionMirror
    if (agentTurn.conversationSessionId && sessionMirror) {
      await options.persistAutobiographicalEpisodesFromPreparedMirror?.({
        cardId: payload.cardId,
        decisionTraceId: runtimeSurface.trace.decisionTraceId ?? null,
        turnId: payload.turnId,
        sessionId: agentTurn.conversationSessionId,
        previousMirror: previousSessionMirror,
        mirror: sessionMirror,
      })
    }

    const preparedResultBase = {
      chatConfig: prelude.chatConfig,
      conversationSessionId: agentTurn.conversationSessionId,
      getSessionTrace: () => agentTurn.snapshot(),
      messages,
      waitForTools,
      tools,
      toolChoice,
      customDirectivesResolution,
      hasVisualGrounding: runtimeSurface.hasVisualGrounding,
      governance: runtimeSurface.governance,
      mindTurnContract: prelude.perceptionAugmentation.chatGovernance.mindTurnContract,
      organicMemoryContext: organicPromptContext,
      memoryTurnArtifact,
      personaKernel,
      performanceManifest,
      replyRealization: runtimeSurface.replyAuthority ?? null,
      replyExecutionPlan: runtimeSurface.replyExecutionPlan ?? null,
      runtimeSurface,
      sessionMirror,
      sessionTrace: agentTurn.snapshot(),
    }
    const turnGraph = buildAlicizationTurnGraph({
      prepared: preparedResultBase as AlicizationPreparedMainChatExecutionResult,
      cardId: payload.cardId,
      turnId: payload.turnId,
      actionObligation: prelude.actionObligation,
      memory: memoryTurnArtifact,
      surface: null,
      routingRequired,
    })

    return {
      ...preparedResultBase,
      turnGraph,
    }
  }

  return {
    clear: () => dialogueSessionManager.clear(),
    prepareExecution,
  }
}
