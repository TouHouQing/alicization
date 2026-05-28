import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationResidentPerformanceSnapshot,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationMainChatTimeoutRecoveryMode } from './main-chat-run-lifecycle'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMainGatewayReachabilitySnapshot } from './main-gateway-health'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  ChatRunState,
  MainGatewayResolvedConfig,
  PreparedMainChatExecution,
} from './runtime-soul'

import {
  alicizationMainGatewayOneShotRecoveryBudget,
  deriveAlicizationResidentPerformanceSnapshot,
} from '@proj-alicization/stage-shared'

import { deriveAlicizationRuntimeSnapshot, projectAlicizationRuntimeDigest } from './alicization-runtime-architecture'
import { deriveAlicizationDigitalLifeSpineFromSurface, projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import {
  buildAlicizationExecutionPayoffDeterministicStructured,
  buildAlicizationExecutionPayoffPrompt,
  normalizeAlicizationExecutionPayoffEmotion,
  normalizeAlicizationExecutionPayoffPerformance,
  selectAlicizationExecutionDeliveryReply,
} from './execution-delivery-surface'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import {
  type AlicizationActiveDialogueFastPathDecision,
  AlicizationActiveDialogueMindAuthorityEscalationError,
  buildAlicizationActiveDialogueFastPathMessages,
  deriveAlicizationActiveDialogueFastPathDecision,
  normalizeAlicizationActiveDialogueFastPathReplyOrEscalate,
} from './main-chat-active-dialogue-loop'
import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'
import {
  alicizationExecutorToolNames,
  asAlicizationInlineExecutionSurfaceInput,
  buildAlicizationMinimalContextRecoveryMessages,
  readAlicizationInlineExecutionReceipt,
  shouldUseAlicizationExecutionFirstFastPath,
  type AlicizationInlineExecutionReceipt,
} from './main-chat-background-rules'
import type {
  AlicizationResolvedVisibleReply,
} from './visible-reply/facade'
import { isAlicizationRequiredToolMissingError } from './main-chat-required-tool'
import {
  recoverAlicizationRequiredToolDeterministically,
  resolveDeterministicRequiredToolNames,
} from './main-chat-required-tool-recovery'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { extractAllowedToolNamesFromToolChoice } from './main-chat-runtime-surface'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import { runAlicizationMainChatStream } from './main-chat-stream-runner'
import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'
import { parseJsonObjectFromText } from './runtime-transport-content'
import { buildAlicizationTurnGraphFromSettlements } from './turn-os/turn-graph'
import {
  AlicizationVisibleReplyClosureBlockedError,
  buildAlicizationSecondPassTransportFailureReply,
  buildAlicizationResolvedVisibleReply,
  buildAlicizationVisibleReplyCriticArtifact,
  buildAlicizationVisibleReplyRealizationArtifact,
  decideAlicizationActiveDialogueCompactAuthority,
  resolveAlicizationPreparedVisibleReplyExecution,
  resolveAlicizationTimeoutRecoveredVisibleReply,
  rewriteAlicizationVisibleReplySecondPass,
  settleAlicizationVisibleReply,
} from './visible-reply/facade'
import {
  mainChatFirstEventTimeoutMs,
  mainChatFirstEventTimeoutWithVisualGroundingMs,
  mainChatTimeoutRecoveryMs,
  mainChatTimeoutRecoveryWithVisualGroundingMs,
  normalizeCardId,
  sanitizeText,
} from './runtime-soul'

interface AlicizationMainChatRunStateFacade {
  setSessionTraceGetter: (key: string, getter: () => AlicizationRuntimeCallChainSnapshot) => void
  finishRun: (key: string, payload: Omit<AlicizationChatFinishEvent, 'cardId' | 'turnId'>) => void
}

interface RunAlicizationMainChatBackgroundOptions {
  key: string
  payload: AlicizationChatStartPayload
  activeCardId: string
  mainGateway: MainGatewayResolvedConfig
  runState: ChatRunState
  preparationPromise: Promise<AlicizationPreparedMainChatExecutionResult>
  headers?: Record<string, string>
  isRunActive: () => boolean
  runStateController: AlicizationMainChatRunStateFacade
  emitMeta: (payload: AlicizationChatMetaEvent) => void
  emitChunk: (payload: AlicizationChatStreamChunkEvent) => void
  emitToolCall: (payload: AlicizationChatToolCallEvent) => void
  emitToolResult: (payload: AlicizationChatToolResultEvent) => void
  emitError: (payload: AlicizationChatErrorEvent) => void
  incrementChunkStats: (rawDelta: string) => void
  ensureMainGatewayReachable: (mainGateway: MainGatewayResolvedConfig, options?: {
    bypassCache?: boolean
  }) => Promise<AlicizationMainGatewayReachabilitySnapshot>
  recordMainGatewayGenerationTimeout: (mainGateway: MainGatewayResolvedConfig, reason: unknown) => void | Promise<void>
  appendRuntimeDebugLine: (event: string, payload: Record<string, unknown>) => Promise<void>
  queueScopedAuditLog: (cardId: string, input: {
    level: 'warning' | 'notice'
    category: string
    action: string
    message: string
    payload: Record<string, unknown>
  }) => Promise<void> | void
  recordPreparedMindTrace?: (input: {
    payload: AlicizationChatStartPayload
    prepared: AlicizationPreparedMainChatExecutionResult
  }) => Promise<void> | void
  suppressInlineExecutionDeliveries?: (input: {
    cardId: string
    entries: Array<{
      completedAt: number
      sessionId: string
      threadId: string
    }>
  }) => Promise<void> | void
  resolveActiveDialogueDeterministicReply?: (input: {
    conversationMessages: Message[]
    decision: AlicizationActiveDialogueFastPathDecision
    prepared: AlicizationPreparedMainChatExecutionResult
  }) => Promise<string | null> | string | null
}

class AlicizationMindAuthoredReplyRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AlicizationMindAuthoredReplyRequiredError'
  }
}

export function resolveAlicizationExecutionPayoffContinuityInputs(input: {
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined
}) {
  const digitalLifeRuntimeSurface = input.runtimeSurface?.digitalLifeRuntimeSurface ?? null
  const personStateProjection = digitalLifeRuntimeSurface?.memory.personStateProjection ?? null
  const hostPersonModel = digitalLifeRuntimeSurface?.memory.hostPersonModel ?? null
  let selfContinuityAuthority = null
  try {
    selfContinuityAuthority = buildSelfContinuityAuthorityFromRuntimeSurface(digitalLifeRuntimeSurface)
  }
  catch {
    selfContinuityAuthority = null
  }
  return {
    personStateProjection,
    hostPersonModel,
    selfContinuityAuthority,
  }
}

export async function runAlicizationMainChatBackground(
  input: RunAlicizationMainChatBackgroundOptions,
) {
  const conversationMessages = Array.isArray(input.payload.messages)
    ? input.payload.messages as Message[]
    : []
  let prepared: AlicizationPreparedMainChatExecutionResult | null = null
  let chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']> | null = null
  let messages: Message[] = []
  let tools: PreparedMainChatExecution['tools']
  let toolChoice: PreparedMainChatExecution['toolChoice']
  let timeoutRecoveryMode: AlicizationMainChatTimeoutRecoveryMode = 'original'
  let timeoutRecoveryMs = mainChatTimeoutRecoveryMs
  const nonProgressEventTypes = new Set<string>()
  let pendingAffirmationToolInputOverrides: Record<string, Record<string, unknown>> | undefined
  let currentVisibleReplyExecution: AlicizationVisibleReplyExecution | null = null
  const resolveDigitalLifeSpineFromPrepared = () => {
    const runtimeSurface = prepared?.runtimeSurface
    if (!runtimeSurface)
      return null
    if (runtimeSurface.digitalLifeSpine)
      return runtimeSurface.digitalLifeSpine
    if (!runtimeSurface.digitalLifeRuntimeSurface)
      return null
    try {
      return deriveAlicizationDigitalLifeSpineFromSurface(runtimeSurface.digitalLifeRuntimeSurface)
    }
    catch {
      return null
    }
  }
  const resolveResidentPerformanceFromPrepared = (): AlicizationResidentPerformanceSnapshot | null => {
    const runtimeSurface = prepared?.runtimeSurface
    const runtimeDigestSurface = runtimeSurface?.digitalLifeSpine?.runtimeSurface
      ?? runtimeSurface?.digitalLifeRuntimeSurface
      ?? null
    if (!runtimeDigestSurface)
      return null

    const updatedAt = Number.isFinite(runtimeDigestSurface.perception.updatedAt)
      ? Number(runtimeDigestSurface.perception.updatedAt)
      : Date.now()
    return deriveAlicizationResidentPerformanceSnapshot({
      watchMode: runtimeDigestSurface.perception.watchMode,
      currentBodyState: runtimeDigestSurface.perception.currentBodyState,
      continuityMode: runtimeDigestSurface.perception.continuityMode,
      currentInwardPreoccupation: runtimeDigestSurface.perception.currentInwardPreoccupation,
      quietLineMs: runtimeDigestSurface.perception.quietLineMs,
      currentScene: runtimeDigestSurface.perception.currentScene,
      attention: runtimeDigestSurface.perception.attention,
      captureState: runtimeDigestSurface.perception.captureState,
      privateThought: runtimeDigestSurface.cognition.privateThought,
      updatedAt,
    }, {
      fallbackUpdatedAt: updatedAt,
      source: 'main-runtime',
    })
  }
  const resolveRuntimeDigestFromPrepared = () => {
    return projectAlicizationRuntimeDigest(
      deriveAlicizationRuntimeSnapshot({
        spine: resolveDigitalLifeSpineFromPrepared(),
      }),
    )
  }
  const streamMetaEmitter = createAlicizationChatStreamMetaEmitter({
    cardId: input.payload.cardId,
    turnId: input.payload.turnId,
    getGovernance: () => prepared?.governance ?? null,
    getVisibleReplyExecution: () => currentVisibleReplyExecution,
    getDigitalLifeSpine: () => projectAlicizationDigitalLifeSpineDigest(resolveDigitalLifeSpineFromPrepared()),
    getRuntimeDigest: () => resolveRuntimeDigestFromPrepared(),
    getResidentPerformance: () => resolveResidentPerformanceFromPrepared(),
    getPerformanceManifest: () => prepared?.performanceManifest ?? null,
    emit: input.emitMeta,
  })
  const emitStreamEmbodimentMeta = streamMetaEmitter.emit
  const executorToolCallIds = new Set<string>()
  const inlineExecutionReceipts = new Map<string, AlicizationInlineExecutionReceipt>()

  const noteInlineExecutionReceipt = (result: unknown) => {
    const receipt = readAlicizationInlineExecutionReceipt(result)
    if (!receipt)
      return
    inlineExecutionReceipts.set(
      `${receipt.sessionId}::${receipt.threadId}::${receipt.completedAt}`,
      receipt,
    )
  }

  const emitToolCall = (event: AlicizationChatToolCallEvent) => {
    const toolName = sanitizeText(event.toolName, '')
    const toolCallId = sanitizeText(event.toolCallId, '')
    if (toolName && toolCallId && alicizationExecutorToolNames.has(toolName))
      executorToolCallIds.add(toolCallId)
    input.emitToolCall(event)
  }

  const emitToolResult = (event: AlicizationChatToolResultEvent) => {
    const toolCallId = sanitizeText(event.toolCallId, '')
    if (toolCallId && executorToolCallIds.has(toolCallId))
      noteInlineExecutionReceipt(event.result)
    input.emitToolResult(event)
  }

  const suppressInlineExecutionDeliveries = async () => {
    if (inlineExecutionReceipts.size === 0 || !input.suppressInlineExecutionDeliveries)
      return

    const entries = [...inlineExecutionReceipts.values()]
    inlineExecutionReceipts.clear()
    await Promise.resolve(input.suppressInlineExecutionDeliveries({
      cardId: input.payload.cardId,
      entries,
    }))
  }

  const rebuildPreparedTurnGraph = (nextPrepared: AlicizationPreparedMainChatExecutionResult, surface: ReturnType<typeof buildAlicizationVisibleReplyRealizationArtifact> | AlicizationResolvedVisibleReply['realization'] | null) => {
    return buildAlicizationTurnGraphFromSettlements({
      prepared: nextPrepared,
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      actionObligation: nextPrepared.runtimeSurface?.action ?? null,
      memory: nextPrepared.memoryTurnArtifact ?? null,
      surface,
      routingRequired: nextPrepared.runtimeSurface?.tooling?.routingRequired ?? false,
      stageSettlements: nextPrepared.turnRuntimeContext?.stageSettlements ?? nextPrepared.turnGraph?.stageSettlements ?? [],
      activeSelfRevision: {
        patchId: nextPrepared.turnRuntimeContext?.selfRevisionConsumption.activePatchId ?? null,
        decisionTraceId: nextPrepared.turnRuntimeContext?.selfRevisionConsumption.activePatchDecisionTraceId ?? null,
        candidateId: nextPrepared.turnRuntimeContext?.selfRevisionConsumption.activeCandidateId ?? null,
      },
    })
  }

  const emitResolvedVisibleReply = (reply: AlicizationResolvedVisibleReply) => {
    currentVisibleReplyExecution = reply.visibleReplyExecution
    if (prepared) {
      const nextPrepared = {
        ...prepared,
      }
      prepared = {
        ...nextPrepared,
        turnGraph: rebuildPreparedTurnGraph(nextPrepared, reply.realization),
      }
    }
    if (!reply.visibleText)
      return
    emitStreamEmbodimentMeta(reply.visibleText)
    input.emitChunk({
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      text: reply.visibleText,
    })
  }

  const closeStructuredVisibleReplyIfNeeded = async (rewriteInput: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    forceRewrite?: boolean
    forceReasonCodes?: string[]
  }) => {
    if (!prepared)
      return null

    const latestUserMessage = [...conversationMessages].reverse().find(message => message?.role === 'user')
    const latestUserText = sanitizeText(latestUserMessage?.content, '')
    if (!latestUserText)
      return null

    try {
      const settled = await settleAlicizationVisibleReply({
        draft: {
          fullText: rewriteInput.fullText,
          visibleReplyExecution: rewriteInput.visibleReplyExecution,
        },
        prepared,
        forceRewrite: rewriteInput.forceRewrite,
        forceReasonCodes: rewriteInput.forceReasonCodes,
        rewriteSecondPass: async secondPassInput => await rewriteAlicizationVisibleReplySecondPass({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          sessionId: prepared!.conversationSessionId,
          userText: latestUserText,
          rawFullText: secondPassInput.fullText,
          prepared: prepared!,
          visibleReplyExecution: secondPassInput.visibleReplyExecution,
          forceRewrite: secondPassInput.forceRewrite,
          forceReasonCodes: secondPassInput.forceReasonCodes,
          headers: input.headers,
          provider: async ({ chatConfig, messages, headers, timeoutMs }) => {
            return await generateAlicizationMainChatNonStreaming({
              chatConfig,
              messages,
              headers,
              timeoutMs,
            })
          },
          appendRuntimeDebugLine: input.appendRuntimeDebugLine,
        }),
      })
      return {
        fullText: settled.fullText,
        visibleReplyExecution: settled.visibleReplyExecution,
        critic: settled.realization.critic ?? null,
        closure: settled.realization.closure ?? null,
      }
    }
    catch (error) {
      const closure = error instanceof AlicizationVisibleReplyClosureBlockedError
        ? error.closure
        : null
      await input.appendRuntimeDebugLine('chat-stream.visible-reply-second-pass-failed', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        reason: error instanceof Error ? error.message : String(error),
        closureStatus: closure?.status ?? null,
        closureReasonCodes: closure?.reasonCodes ?? [],
      })
      const reachability = await input.ensureMainGatewayReachable(input.mainGateway, { bypassCache: true }).catch(() => null)
      if (reachability?.reachable !== false) {
        throw new AlicizationMindAuthoredReplyRequiredError(
          `visible-reply-second-pass-required:${error instanceof Error ? error.message : String(error)}`,
        )
      }
      const blockedTransportFailure = buildAlicizationSecondPassTransportFailureReply({
        governedStructured: parseJsonObjectFromText(rewriteInput.fullText),
        previousExecution: rewriteInput.visibleReplyExecution,
        reason: error instanceof Error ? error.message : String(error),
      })
      await input.appendRuntimeDebugLine('chat-stream.visible-reply-second-pass-local-fallback-blocked', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        reason: blockedTransportFailure.visibleReplyExecution.reason,
        gatewayReachable: reachability?.reachable ?? null,
        gatewayReason: reachability?.reason ?? null,
        closureReasonCodes: closure?.reasonCodes ?? [],
      })
      throw new AlicizationMindAuthoredReplyRequiredError(
        `visible-reply-second-pass-required:${blockedTransportFailure.visibleReplyExecution.reason}`,
      )
    }
  }

  const rewriteStructuredVisibleReplyIfNeeded = async (rewriteInput: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    forceRewrite?: boolean
    forceReasonCodes?: string[]
  }) => {
    const closed = await closeStructuredVisibleReplyIfNeeded(rewriteInput)
    if (!closed)
      return null
    return {
      fullText: closed.fullText,
      visibleReplyExecution: closed.visibleReplyExecution,
      critic: closed.critic,
      closure: closed.closure,
    }
  }

  const syncVisibleReplyExecutionFromPreparedPlan = (override?: {
    mode?: AlicizationVisibleReplyExecution['mode']
    actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
    providerMindExecuted?: boolean
    reason?: string | null
  }) => {
    if (!prepared)
      return

    currentVisibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared,
      mode: override?.mode,
      actualVisibleReplyAuthority: override?.actualVisibleReplyAuthority,
      providerMindExecuted: override?.providerMindExecuted,
      reason: override?.reason,
    })
  }

  const attemptDeterministicRequiredToolRecovery = async (recoveryInput: {
    error?: unknown
    origin: 'execution-first' | 'stream' | 'timeout-recovery'
    requiredToolNames?: string[]
    toolInputOverrides?: Record<string, Record<string, unknown>>
  }) => {
    if (!prepared || !input.isRunActive())
      return null

    const requiredToolNames = resolveDeterministicRequiredToolNames({
      error: recoveryInput.error,
      fallbackToolNames: recoveryInput.requiredToolNames?.length
        ? recoveryInput.requiredToolNames
        : prepared.runtimeSurface?.tooling?.enforcedToolNames,
    })
    if (requiredToolNames.length === 0)
      return null
    if (!Array.isArray(prepared.tools) || prepared.tools.length === 0)
      return null

    const recoveryStartAudit = recoveryInput.origin === 'execution-first'
      ? {
          level: 'notice' as const,
          action: 'execution-first-inline-started',
          message: 'Explicit execution turn routed directly into deterministic executor dispatch before model streaming.',
        }
      : {
          level: 'warning' as const,
          action: 'required-tool-recovery-started',
          message: 'Model skipped required executor tool call; switched to deterministic executor recovery.',
        }
    await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-started', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      origin: recoveryInput.origin,
      requiredToolNames,
    })
    await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
      level: recoveryStartAudit.level,
      category: 'alicization.main-gateway',
      action: recoveryStartAudit.action,
      message: recoveryStartAudit.message,
      payload: {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        origin: recoveryInput.origin,
        requiredToolNames,
      },
    }))

    const recoveryResult = await recoverAlicizationRequiredToolDeterministically({
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      messages,
      tools: prepared.tools as never,
      requiredToolNames,
      toolInputOverrides: recoveryInput.toolInputOverrides,
      emitToolCall: payload => emitToolCall(payload),
      emitToolResult: payload => emitToolResult(payload),
    })
    noteInlineExecutionReceipt(recoveryResult.toolResult)

    const recoveryFinishAudit = recoveryInput.origin === 'execution-first'
      ? {
          action: 'execution-first-inline-finished',
          message: 'Execution-first inline executor dispatch completed before model streaming.',
        }
      : {
          action: 'required-tool-recovery-finished',
          message: 'Deterministic executor recovery completed and produced a user-facing answer.',
        }
    await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-finished', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      origin: recoveryInput.origin,
      toolName: recoveryResult.toolName,
      fullTextChars: recoveryResult.fullText.length,
    })
    await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
      level: 'notice',
      category: 'alicization.main-gateway',
      action: recoveryFinishAudit.action,
      message: recoveryFinishAudit.message,
      payload: {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        origin: recoveryInput.origin,
        toolName: recoveryResult.toolName,
      },
    }))

    return recoveryResult
  }

  const attemptInlineExecutionPayoff = async (recoveryResult: Awaited<ReturnType<typeof recoverAlicizationRequiredToolDeterministically>>) => {
    if (!prepared || !chatConfig || !input.isRunActive()) {
      throw new AlicizationMindAuthoredReplyRequiredError('mind-authored-execution-payoff-required:execution-inline-payoff-unprepared')
    }

    const surfaceInput = asAlicizationInlineExecutionSurfaceInput(recoveryResult.toolName, recoveryResult.toolResult)
    if (!surfaceInput) {
      const rewritten = await rewriteStructuredVisibleReplyIfNeeded({
        fullText: recoveryResult.fullText,
        visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
          prepared,
          mode: 'provider-one-shot',
          actualVisibleReplyAuthority: 'local-deterministic-fallback',
          providerMindExecuted: false,
          reason: 'execution-inline-payoff-second-pass-required:unsupported-surface',
        }),
        forceRewrite: true,
        forceReasonCodes: ['execution-inline-payoff-unsupported-surface'],
      })
      if (rewritten)
        return buildAlicizationResolvedVisibleReply(rewritten)
      throw new AlicizationMindAuthoredReplyRequiredError('mind-authored-execution-payoff-required:execution-inline-payoff-unsupported-surface')
    }

    const continuityInputs = resolveAlicizationExecutionPayoffContinuityInputs({
      runtimeSurface: prepared.runtimeSurface,
    })
    const deterministicStructured = buildAlicizationExecutionPayoffDeterministicStructured({
      mode: 'inline-execution',
      channel: surfaceInput.channel,
      goal: surfaceInput.goal,
      status: surfaceInput.status,
      summary: surfaceInput.summary,
      outcome: surfaceInput.outcome,
      personStateProjection: continuityInputs.personStateProjection,
      selfContinuityAuthority: continuityInputs.selfContinuityAuthority,
      hostPersonModel: continuityInputs.hostPersonModel,
      visibleReplyAuthority: 'llm-second-pass-rewrite',
    })

    try {
      const prompt = buildAlicizationExecutionPayoffPrompt({
        mode: 'inline-execution',
        channel: surfaceInput.channel,
        goal: surfaceInput.goal,
        status: surfaceInput.status,
        summary: surfaceInput.summary,
        outcome: surfaceInput.outcome,
        userText: input.payload.messages.at(-1)?.role === 'user'
          ? sanitizeText(String(input.payload.messages.at(-1)?.content ?? ''), '')
          : null,
        trace: {
          decisionTraceId: prepared.runtimeSurface.trace.decisionTraceId,
          turnMode: prepared.runtimeSurface.trace.turnMode,
          personaKernelMode: prepared.runtimeSurface.trace.personaKernelMode,
        },
        governance: prepared.runtimeSurface.governance
          ? {
              relationshipPosture: prepared.runtimeSurface.governance.relationshipPosture,
              answerAct: prepared.runtimeSurface.governance.answerAct,
              answerSubject: prepared.runtimeSurface.governance.answerSubject,
              focusAnchor: prepared.runtimeSurface.governance.focusAnchor,
              answerIntent: prepared.runtimeSurface.governance.answerIntent,
            }
          : null,
        personStateProjection: continuityInputs.personStateProjection,
        selfContinuityAuthority: continuityInputs.selfContinuityAuthority,
        hostPersonModel: continuityInputs.hostPersonModel,
      })
      await input.appendRuntimeDebugLine('chat-stream.execution-payoff-started', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        channel: surfaceInput.channel,
        status: surfaceInput.status,
      })
      const nonStreamingResult = await generateAlicizationMainChatNonStreaming({
        chatConfig,
        headers: input.headers,
        messages: [
          { role: 'system', content: prompt.system },
          ...buildAlicizationMinimalContextRecoveryMessages(messages),
          { role: 'user', content: prompt.user },
        ],
        timeoutMs: 9_000,
      })
      const parsed = parseJsonObjectFromText(nonStreamingResult.fullText)
      if (!parsed)
        throw new Error('execution-payoff-invalid-json')

      const llmReply = sanitizeText(parsed.reply, '')
      if (!llmReply)
        throw new Error('execution-payoff-missing-reply')

      const selectedReply = selectAlicizationExecutionDeliveryReply({
        channel: surfaceInput.channel,
        goal: surfaceInput.goal,
        llmReply,
        outcome: surfaceInput.outcome,
        status: surfaceInput.status,
        summary: surfaceInput.summary,
        personStateProjection: continuityInputs.personStateProjection,
        selfContinuityAuthority: continuityInputs.selfContinuityAuthority,
        hostPersonModel: continuityInputs.hostPersonModel,
      })
      const emotion = normalizeAlicizationExecutionPayoffEmotion(
        parsed.emotion,
        deterministicStructured.emotion,
      )
      const performance = normalizeAlicizationExecutionPayoffPerformance(
        parsed.performance,
        emotion,
        deterministicStructured.performance,
      )
      const structured = {
        ...deterministicStructured,
        thought: sanitizeText(parsed.thought, '') || deterministicStructured.thought,
        emotion,
        reply: selectedReply.reply,
        performance,
        visibleReplyAuthority: selectedReply.source === 'llm'
          ? 'llm-mind'
          : 'llm-second-pass-rewrite',
      }
      if (selectedReply.source !== 'llm') {
        const rewritten = await rewriteStructuredVisibleReplyIfNeeded({
          fullText: JSON.stringify(structured),
          visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
            prepared,
            mode: 'provider-one-shot',
            actualVisibleReplyAuthority: 'local-deterministic-fallback',
            providerMindExecuted: false,
            reason: `execution-inline-payoff-second-pass-required:${selectedReply.reason ?? 'llm-repaired'}`,
          }),
          forceRewrite: true,
          forceReasonCodes: [`execution-inline-payoff:${selectedReply.reason ?? 'llm-repaired'}`],
        })
        if (!rewritten) {
          throw new AlicizationMindAuthoredReplyRequiredError(
            `mind-authored-execution-payoff-required:${selectedReply.reason ?? 'llm-repaired'}`,
          )
        }
        await input.appendRuntimeDebugLine('chat-stream.execution-payoff-finished', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          channel: surfaceInput.channel,
          status: surfaceInput.status,
          source: 'llm-second-pass-rewrite',
          surfaceReason: selectedReply.reason ?? null,
        })
        return buildAlicizationResolvedVisibleReply(rewritten)
      }
      await input.appendRuntimeDebugLine('chat-stream.execution-payoff-finished', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        channel: surfaceInput.channel,
        status: surfaceInput.status,
        source: selectedReply.source,
        surfaceReason: selectedReply.reason ?? null,
      })
      return buildAlicizationResolvedVisibleReply({
        fullText: JSON.stringify(structured),
        visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
          prepared,
          mode: 'provider-one-shot',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'execution-inline-payoff',
        }),
      })
    }
    catch (error) {
      let reachability: AlicizationMainGatewayReachabilitySnapshot | null = null
      try {
        reachability = await input.ensureMainGatewayReachable(input.mainGateway, { bypassCache: true })
      }
      catch {}
      await input.appendRuntimeDebugLine('chat-stream.execution-payoff-failed', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        reason: error instanceof Error ? error.message : String(error),
        gatewayReachable: reachability?.reachable ?? null,
        gatewayReason: reachability?.reason ?? null,
      })
      throw new AlicizationMindAuthoredReplyRequiredError(
        `mind-authored-execution-payoff-required:${reachability?.reachable === false ? 'provider-unavailable' : error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  try {
    prepared = await input.preparationPromise
    if (!input.isRunActive())
      return

    chatConfig = prepared.chatConfig
    messages = prepared.messages
    tools = prepared.tools
    toolChoice = prepared.toolChoice
    input.runStateController.setSessionTraceGetter(input.key, prepared.getSessionTrace)
    const runtimeSurface = prepared.runtimeSurface
    const enforcedExecutionTools = extractAllowedToolNamesFromToolChoice(toolChoice, tools)
    pendingAffirmationToolInputOverrides = (() => {
      const threadId = sanitizeText(runtimeSurface.action?.resumePendingThreadId, '')
      if (!threadId)
        return undefined
      const channel = sanitizeText(runtimeSurface.action?.resumePendingThreadChannel, '')
      const requiredToolName = channel === 'cli'
        ? 'executor_run_cli'
        : channel === 'codex'
          ? 'executor_run_codex'
          : channel === 'claude-code'
            ? 'executor_run_claude_code'
            : channel === 'openclaw'
              ? 'executor_run_openclaw'
              : ''
      if (!requiredToolName)
        return undefined
      return {
        [requiredToolName]: {
          threadId,
        },
      } satisfies Record<string, Record<string, unknown>>
    })()
    timeoutRecoveryMode = !toolChoice && Array.isArray(tools) && tools.length > 0
      ? 'tools-disabled'
      : 'original'
    timeoutRecoveryMs = prepared.hasVisualGrounding
      ? mainChatTimeoutRecoveryWithVisualGroundingMs
      : mainChatTimeoutRecoveryMs
    const firstEventTimeoutMs = prepared.hasVisualGrounding
      ? mainChatFirstEventTimeoutWithVisualGroundingMs
      : mainChatFirstEventTimeoutMs

    syncVisibleReplyExecutionFromPreparedPlan()
    emitStreamEmbodimentMeta('', { force: true })
    void input.queueScopedAuditLog(input.payload.cardId, {
      level: 'notice',
      category: 'alicization.main-gateway',
      action: 'stream-started',
      message: 'Accepted a main-process Alicization chat stream.',
      payload: {
        cardId: input.runState.cardId,
        turnId: input.runState.turnId,
        providerId: input.payload.providerId,
        model: input.payload.model,
        hasVisualGrounding: prepared.hasVisualGrounding,
        hasSender: Boolean(input.runState.sender),
        senderId: input.runState.sender?.id ?? null,
        customDirectivesSource: prepared.customDirectivesResolution.source,
        customDirectivesChars: prepared.customDirectivesResolution.text.length,
        decisionTraceId: runtimeSurface.trace.decisionTraceId,
        personaKernelMode: runtimeSurface.trace.personaKernelMode,
        sessionPhases: prepared.getSessionTrace().phaseOrder,
        captureHealth: runtimeSurface.capture.health,
        capturePermission: runtimeSurface.capture.permission,
        captureFallbackReason: runtimeSurface.capture.fallbackReason,
        enforcedExecutionTools,
      },
    })
    await input.appendRuntimeDebugLine('chat-start.prepared', {
      cardId: input.runState.cardId,
      turnId: input.runState.turnId,
      hasVisualGrounding: prepared.hasVisualGrounding,
      customDirectivesSource: prepared.customDirectivesResolution.source,
      customDirectivesChars: prepared.customDirectivesResolution.text.length,
      governanceTurnMode: runtimeSurface.trace.turnMode,
      decisionTraceId: runtimeSurface.trace.decisionTraceId,
      personaKernelMode: runtimeSurface.trace.personaKernelMode,
      sessionPhases: prepared.getSessionTrace().phaseOrder,
      captureHealth: runtimeSurface.capture.health,
      capturePermission: runtimeSurface.capture.permission,
      captureFallbackReason: runtimeSurface.capture.fallbackReason,
      enforcedExecutionTools,
    })
    try {
      await Promise.resolve(input.recordPreparedMindTrace?.({
        payload: input.payload,
        prepared,
      }))
    }
    catch (error) {
      await input.appendRuntimeDebugLine('chat-start.prepared-mind-trace-failed', {
        cardId: input.runState.cardId,
        turnId: input.runState.turnId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
    await input.appendRuntimeDebugLine('chat-stream.started', {
      cardId: input.runState.cardId,
      turnId: input.runState.turnId,
      firstEventTimeoutMs,
      timeoutRecoveryMs,
      timeoutRecoveryMode,
      hasVisualGrounding: prepared.hasVisualGrounding,
      waitForTools: prepared.waitForTools,
      toolCount: Array.isArray(tools) ? tools.length : 0,
      messageCount: messages.length,
    })
    if (shouldUseAlicizationExecutionFirstFastPath({
      prepared,
      enforcedExecutionTools,
    })) {
      try {
        await input.appendRuntimeDebugLine('chat-stream.execution-first-inline-started', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          enforcedExecutionTools,
          actionKind: prepared.runtimeSurface.action?.kind ?? null,
        })
        const deterministicRecovery = await attemptDeterministicRequiredToolRecovery({
          origin: 'execution-first',
          requiredToolNames: enforcedExecutionTools,
          toolInputOverrides: pendingAffirmationToolInputOverrides,
        })
        if (deterministicRecovery) {
          const payoffReply = await attemptInlineExecutionPayoff(deterministicRecovery)
          emitResolvedVisibleReply(payoffReply)
          await suppressInlineExecutionDeliveries()
          await input.appendRuntimeDebugLine('chat-stream.execution-first-inline-finished', {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            fullTextChars: payoffReply.fullText.length,
            toolName: deterministicRecovery.toolName,
          })
          input.runStateController.finishRun(input.key, {
            status: 'completed',
            finishReason: 'execution-first-inline',
            fullText: payoffReply.fullText,
            visibleReplyExecution: payoffReply.visibleReplyExecution,
          })
          return
        }
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.execution-first-inline-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          reason: error instanceof Error ? error.message : String(error),
        })
        if (error instanceof AlicizationMindAuthoredReplyRequiredError)
          throw error
      }
    }
    const activeDialogueDecision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared,
      runtimeDigest: resolveRuntimeDigestFromPrepared(),
    })
    const activeDialogueCompactAuthority = decideAlicizationActiveDialogueCompactAuthority(activeDialogueDecision)
    const activeDialogueUsesCompactFastPath = activeDialogueDecision
      && activeDialogueCompactAuthority.allowed
    if (activeDialogueDecision && !activeDialogueUsesCompactFastPath) {
      await input.appendRuntimeDebugLine('chat-stream.active-dialogue-deferred-to-main-runtime', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        lane: activeDialogueDecision.lane,
        strategy: activeDialogueDecision.strategy,
        reasonCodes: activeDialogueDecision.reasonCodes,
        deferredReason: activeDialogueCompactAuthority.reason,
      })
    }
    if (activeDialogueDecision && activeDialogueUsesCompactFastPath) {
      const resolveActiveDialogueMindReply = async (decision: AlicizationActiveDialogueFastPathDecision) => {
        const compactMessages = buildAlicizationActiveDialogueFastPathMessages({
          conversationMessages,
          decision,
          prepared: prepared!,
        })
        const oneShotTimeoutMs = Math.max(
          decision.timeoutMs,
          decision.strategy === 'compact-one-shot' ? 6_500 : 9_000,
        )
        await input.appendRuntimeDebugLine('chat-stream.active-dialogue-mind-started', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          lane: decision.lane,
          strategy: decision.strategy,
          timeoutMs: oneShotTimeoutMs,
          messageCount: compactMessages.length,
        })
        const compactReply = await recoverAlicizationMainChatFromTimeout({
          chatConfig: chatConfig!,
          messages: compactMessages,
          headers: input.headers,
          timeoutMs: oneShotTimeoutMs,
          maxSteps: 2,
        })
        return normalizeAlicizationActiveDialogueFastPathReplyOrEscalate({
          decision,
          rawText: compactReply,
        })
      }
      await input.appendRuntimeDebugLine('chat-stream.active-dialogue-lane-selected', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        lane: activeDialogueDecision.lane,
        strategy: activeDialogueDecision.strategy,
        timeoutMs: activeDialogueDecision.timeoutMs,
        resolvedTimeZone: activeDialogueDecision.resolvedTimeZone,
        resolvedTimeZoneSource: activeDialogueDecision.resolvedTimeZoneSource,
        reasonCodes: activeDialogueDecision.reasonCodes,
      })

      try {
        const normalizedReply = await resolveActiveDialogueMindReply(activeDialogueDecision)
        const resolvedReply = buildAlicizationResolvedVisibleReply({
          fullText: normalizedReply,
          visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
            prepared,
            mode: 'provider-one-shot',
            providerMindExecuted: true,
            reason: 'active-dialogue-fast-path',
          }),
        })
        const rewritten = await rewriteStructuredVisibleReplyIfNeeded({
          fullText: resolvedReply.fullText,
          visibleReplyExecution: resolvedReply.visibleReplyExecution,
        })
        const finalReply = rewritten
          ? buildAlicizationResolvedVisibleReply(rewritten)
          : resolvedReply
        emitResolvedVisibleReply(finalReply)
        await input.appendRuntimeDebugLine('chat-stream.active-dialogue-mind-finished', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          lane: activeDialogueDecision.lane,
          strategy: activeDialogueDecision.strategy,
          fullTextChars: finalReply.fullText.length,
        })
        input.runStateController.finishRun(input.key, {
          status: 'completed',
          finishReason: 'active-dialogue-fast-path',
          fullText: finalReply.fullText,
          visibleReplyExecution: finalReply.visibleReplyExecution,
        })
        return
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.active-dialogue-fast-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          lane: activeDialogueDecision.lane,
          strategy: activeDialogueDecision.strategy,
          reason: error instanceof Error ? error.message : String(error),
        })
        await input.appendRuntimeDebugLine('chat-stream.active-dialogue-escalated-to-main-runtime', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          lane: activeDialogueDecision.lane,
          strategy: activeDialogueDecision.strategy,
          escalationReason: error instanceof Error ? error.message : String(error),
          mindAuthorityEscalation: error instanceof AlicizationActiveDialogueMindAuthorityEscalationError,
        })
      }
    }
    const streamResult = await runAlicizationMainChatStream({
      payload: input.payload,
      prepared,
      headers: input.headers,
      controller: input.runState.controller,
      firstEventTimeoutMs,
      isRunActive: input.isRunActive,
      nonProgressEventTypes,
      streamMeta: streamMetaEmitter,
      incrementChunkStats: input.incrementChunkStats,
      emitChunk: input.emitChunk,
      emitToolCall,
      emitToolResult,
      generateNonStreaming: async (oneShotInput) => {
        const cardId = normalizeCardId(oneShotInput.cardId ?? input.activeCardId)
        const turnId = sanitizeText(oneShotInput.turnId)
        await input.appendRuntimeDebugLine('chat-stream.visual-one-shot-started', {
          cardId,
          turnId,
          timeoutMs: oneShotInput.timeoutMs,
          toolCount: Array.isArray(oneShotInput.tools) ? oneShotInput.tools.length : 0,
          messageCount: oneShotInput.messages.length,
        })
        try {
          const result = await generateAlicizationMainChatNonStreaming(oneShotInput)
          await input.appendRuntimeDebugLine('chat-stream.visual-one-shot-finished', {
            cardId,
            turnId,
            finishReason: result.finishReason,
            finalChars: result.fullText.length,
          })
          return result
        }
        catch (error) {
          await input.appendRuntimeDebugLine('chat-stream.visual-one-shot-failed', {
            cardId,
            turnId,
            timeoutMs: oneShotInput.timeoutMs,
            reason: error instanceof Error ? error.message : String(error),
          })
          throw error
        }
      },
      logReminderToolCall: async ({ toolCallId, toolName, argumentsPreview }) => {
        await input.appendRuntimeDebugLine('reminder.stream-tool-call', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          toolCallId,
          toolName,
          argumentsPreview,
        })
      },
      logReminderToolResult: async ({ toolCallId, summary }) => {
        await input.appendRuntimeDebugLine('reminder.stream-tool-result', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          toolCallId,
          ...summary,
          triggerIso: typeof summary.triggerAt === 'number' ? new Date(summary.triggerAt).toISOString() : undefined,
        })
      },
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      rewriteStructuredVisibleReply: rewriteStructuredVisibleReplyIfNeeded,
      delayVisibleRelease: true,
      turnRuntimeContext: prepared?.turnRuntimeContext ?? null,
    })
    if (streamResult.fullText.trim()) {
      await suppressInlineExecutionDeliveries()
    }
    currentVisibleReplyExecution = streamResult.visibleReplyExecution
    if (prepared) {
      const critic = streamResult.visibleReplyCritic ?? buildAlicizationVisibleReplyCriticArtifact({
        fullText: streamResult.fullText,
        visibleReplyExecution: streamResult.visibleReplyExecution,
        prepared,
      })
      const surface = buildAlicizationVisibleReplyRealizationArtifact({
        fullText: streamResult.fullText,
        visibleReplyExecution: streamResult.visibleReplyExecution,
        critic,
        closure: streamResult.visibleReplyClosure ?? null,
      })
      const nextPrepared = {
        ...prepared,
      }
      prepared = {
        ...nextPrepared,
        turnGraph: rebuildPreparedTurnGraph(nextPrepared, surface),
      }
      try {
        await Promise.resolve(input.recordPreparedMindTrace?.({
          payload: input.payload,
          prepared,
        }))
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.completed-mind-trace-failed', {
          cardId: input.runState.cardId,
          turnId: input.runState.turnId,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }
    input.runStateController.finishRun(input.key, {
      status: 'completed',
      finishReason: streamResult.finishReason,
      fullText: streamResult.fullText,
      visibleReplyExecution: streamResult.visibleReplyExecution ?? currentVisibleReplyExecution ?? undefined,
    })
  }
  catch (error) {
    let failureError: unknown = error
    if (isAlicizationRequiredToolMissingError(error)) {
      try {
        const deterministicRecovery = await attemptDeterministicRequiredToolRecovery({
          error,
          origin: 'stream',
          toolInputOverrides: pendingAffirmationToolInputOverrides,
        })
        if (deterministicRecovery) {
          const payoffReply = await attemptInlineExecutionPayoff(deterministicRecovery)
          emitResolvedVisibleReply(payoffReply)
          await suppressInlineExecutionDeliveries()
          input.runStateController.finishRun(input.key, {
            status: 'completed',
            finishReason: 'required-tool-recovered',
            fullText: payoffReply.fullText,
            visibleReplyExecution: payoffReply.visibleReplyExecution,
          })
          return
        }
      }
      catch (recoveryError) {
        failureError = recoveryError
        await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          origin: 'stream',
          reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
        })
      }
    }

    await handleAlicizationMainChatRunFailure({
      error: failureError,
      prepared,
      controller: input.runState.controller,
      mainGateway: input.mainGateway,
      chatConfig,
      messages,
      headers: input.headers,
      tools,
      toolChoice,
      timeoutRecoveryMode,
      timeoutRecoveryMs,
      payload: input.payload,
      dispatchBound: input.runState.hasLoggedDispatchBinding === true,
      nonProgressEventTypes,
      isRunActive: input.isRunActive,
      ensureMainGatewayReachable: input.ensureMainGatewayReachable,
      recordMainGatewayGenerationTimeout: input.recordMainGatewayGenerationTimeout,
      recoverFromTimeout: async (recoveryInput) => {
        const preparedExecution = prepared!
        const normalizedCardId = normalizeCardId(input.payload.cardId ?? input.activeCardId)
        const normalizedTurnId = sanitizeText(input.payload.turnId)
        const requiredToolNames = extractAllowedToolNamesFromToolChoice(recoveryInput.toolChoice, recoveryInput.tools)
        const effectiveRequiredToolNames = requiredToolNames.length > 0
          ? requiredToolNames
          : (preparedExecution.runtimeSurface.tooling?.enforcedToolNames ?? [])
        const toolingRequired = effectiveRequiredToolNames.length > 0
        if (toolingRequired) {
          try {
            const deterministicRecovery = await attemptDeterministicRequiredToolRecovery({
              origin: 'timeout-recovery',
              requiredToolNames: effectiveRequiredToolNames,
              toolInputOverrides: pendingAffirmationToolInputOverrides,
            })
            if (deterministicRecovery) {
              const payoffReply = await attemptInlineExecutionPayoff(deterministicRecovery)
              await suppressInlineExecutionDeliveries()
              await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-finished', {
                cardId: normalizedCardId,
                turnId: normalizedTurnId,
                chunkCount: 1,
                rawChunkChars: payoffReply.fullText.length,
                finalChars: payoffReply.fullText.length,
                recoveryMode: 'deterministic-required-tool',
              })
              return {
                recoveredReply: payoffReply,
                recoveryMode: 'deterministic-required-tool',
              }
            }
          }
          catch (error) {
            await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-failed', {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              origin: 'timeout-recovery',
              recoveryMode: 'deterministic-required-tool',
              reason: error instanceof Error ? error.message : String(error),
            })
          }
        }

        const recoveryAttempts: Array<{
          mode: AlicizationMainChatTimeoutRecoveryMode
          input: typeof recoveryInput & { maxSteps?: number }
          normalizeRecoveredText?: (rawText: string) => string
        }> = []
        const recoveryConversationMessages = recoveryInput.messages.length > 0
          ? recoveryInput.messages
          : conversationMessages
        const timeoutActiveDialogueDecision = !toolingRequired
          ? deriveAlicizationActiveDialogueFastPathDecision({
              conversationMessages: recoveryConversationMessages,
              prepared: preparedExecution,
              runtimeDigest: resolveRuntimeDigestFromPrepared(),
            })
          : null
        const timeoutActiveDialogueCompactAuthority = decideAlicizationActiveDialogueCompactAuthority(timeoutActiveDialogueDecision)
        const timeoutActiveDialogueUsesCompactRecovery
          = !toolingRequired
            && !!timeoutActiveDialogueDecision
            && timeoutActiveDialogueCompactAuthority.allowed
        if (!toolingRequired && timeoutActiveDialogueDecision && !timeoutActiveDialogueUsesCompactRecovery) {
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-active-dialogue-deferred', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            lane: timeoutActiveDialogueDecision.lane,
            strategy: timeoutActiveDialogueDecision.strategy,
            reasonCodes: timeoutActiveDialogueDecision.reasonCodes,
            deferredReason: timeoutActiveDialogueCompactAuthority.reason,
          })
        }
        if (timeoutActiveDialogueUsesCompactRecovery && timeoutActiveDialogueDecision) {
          const oneShotTimeoutMs = Math.max(
            timeoutActiveDialogueDecision.timeoutMs,
            6_500,
          )
          recoveryAttempts.push({
            mode: 'active-dialogue-compact',
            input: {
              ...recoveryInput,
              messages: buildAlicizationActiveDialogueFastPathMessages({
                conversationMessages: recoveryConversationMessages,
                decision: timeoutActiveDialogueDecision,
                prepared: preparedExecution,
              }),
              tools: undefined,
              toolChoice: undefined,
              timeoutMs: Math.max(
                oneShotTimeoutMs,
                Math.min(recoveryInput.timeoutMs, 9_000),
              ),
              maxSteps: 2,
            },
            normalizeRecoveredText: rawText => normalizeAlicizationActiveDialogueFastPathReplyOrEscalate({
              decision: timeoutActiveDialogueDecision,
              rawText,
            }),
          })
        }
        const effectiveRecoveryInput = timeoutRecoveryMode === 'tools-disabled'
          ? {
              ...recoveryInput,
              tools: undefined,
              toolChoice: undefined,
            }
          : recoveryInput
        recoveryAttempts.push({
          mode: timeoutRecoveryMode === 'tools-disabled' ? 'tools-disabled' : 'non-streaming',
          input: {
            ...effectiveRecoveryInput,
            timeoutMs: toolingRequired
              ? Math.max(
                  alicizationMainGatewayOneShotRecoveryBudget.toolingRequiredPrimaryMs,
                  recoveryInput.timeoutMs,
                )
              : Math.max(
                  alicizationMainGatewayOneShotRecoveryBudget.primaryMs,
                  recoveryInput.timeoutMs,
                ),
            maxSteps: toolingRequired ? 4 : 2,
          },
        })
        if (!toolingRequired) {
          const minimalMessages = buildAlicizationMinimalContextRecoveryMessages(recoveryInput.messages)
          if (minimalMessages.length < recoveryInput.messages.length || recoveryInput.messages.length > 6) {
            recoveryAttempts.push({
              mode: 'minimal-context-non-streaming',
              input: {
                ...recoveryInput,
                messages: minimalMessages,
                tools: undefined,
                toolChoice: undefined,
                timeoutMs: Math.max(
                  alicizationMainGatewayOneShotRecoveryBudget.minimalContextMs,
                  recoveryInput.timeoutMs,
                ),
                maxSteps: 2,
              },
            })
          }
        }
        await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-started', {
          cardId: normalizedCardId,
          turnId: normalizedTurnId,
          timeoutMs: recoveryInput.timeoutMs,
          recoveryMode: timeoutRecoveryMode,
          toolCount: Array.isArray(recoveryInput.tools) ? recoveryInput.tools.length : 0,
          messageCount: recoveryInput.messages.length,
          recoveryAttemptModes: recoveryAttempts.map(attempt => attempt.mode),
        })
        let lastRecoveryError: unknown = null
        for (let index = 0; index < recoveryAttempts.length; index += 1) {
          const attempt = recoveryAttempts[index]
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-attempt', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            attempt: index + 1,
            totalAttempts: recoveryAttempts.length,
            recoveryMode: attempt.mode,
            timeoutMs: attempt.input.timeoutMs,
            toolCount: Array.isArray(attempt.input.tools) ? attempt.input.tools.length : 0,
            messageCount: attempt.input.messages.length,
            maxSteps: attempt.input.maxSteps ?? 1,
          })
          try {
            const recoveredText = await recoverAlicizationMainChatFromTimeout(attempt.input)
            const normalizedRecoveredText = attempt.normalizeRecoveredText
              ? attempt.normalizeRecoveredText(recoveredText)
              : recoveredText
            if (!normalizedRecoveredText) {
              lastRecoveryError = new Error('empty-recovery-text')
              await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-attempt-empty', {
                cardId: normalizedCardId,
                turnId: normalizedTurnId,
                attempt: index + 1,
                totalAttempts: recoveryAttempts.length,
                recoveryMode: attempt.mode,
              })
              continue
            }

            await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-finished', {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              chunkCount: 1,
              rawChunkChars: recoveredText.length,
              finalChars: normalizedRecoveredText.length,
              recoveryMode: attempt.mode,
            })
            return {
              recoveredReply: resolveAlicizationTimeoutRecoveredVisibleReply({
                prepared: preparedExecution,
                recoveredText: normalizedRecoveredText,
                recoveryMode: attempt.mode,
              }),
              recoveryMode: attempt.mode,
            }
          }
          catch (error) {
            if (isAlicizationRequiredToolMissingError(error)) {
              try {
                const deterministicRecovery = await attemptDeterministicRequiredToolRecovery({
                  error,
                  origin: 'timeout-recovery',
                  toolInputOverrides: pendingAffirmationToolInputOverrides,
                })
                if (deterministicRecovery) {
                  const payoffReply = await attemptInlineExecutionPayoff(deterministicRecovery)
                  await suppressInlineExecutionDeliveries()
                  return {
                    recoveredReply: payoffReply,
                    recoveryMode: attempt.mode,
                  }
                }
              }
              catch (recoveryError) {
                lastRecoveryError = recoveryError
                await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-failed', {
                  cardId: normalizedCardId,
                  turnId: normalizedTurnId,
                  attempt: index + 1,
                  totalAttempts: recoveryAttempts.length,
                  recoveryMode: attempt.mode,
                  origin: 'timeout-recovery',
                  reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
                })
                continue
              }
            }

            lastRecoveryError = error
            await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-attempt-failed', {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              attempt: index + 1,
              totalAttempts: recoveryAttempts.length,
              recoveryMode: attempt.mode,
              reason: error instanceof Error ? error.message : String(error),
            })
          }
        }

        const localFallbackReply = buildAlicizationMainGatewayTimeoutFallbackReply({
          messages: conversationMessages.length > 0
            ? conversationMessages
            : recoveryInput.messages,
          turnId: normalizedTurnId,
          actionKind: preparedExecution.runtimeSurface.action?.kind ?? null,
          digitalLifeSpine: preparedExecution.runtimeSurface.digitalLifeSpine ?? null,
          governance: preparedExecution.governance ?? preparedExecution.runtimeSurface.governance ?? null,
          personaKernel: preparedExecution.personaKernel ?? null,
          runtimeDigest: resolveRuntimeDigestFromPrepared(),
          sessionMirror: preparedExecution.sessionMirror ?? null,
        })
        let fallbackReachability: AlicizationMainGatewayReachabilitySnapshot | null = null
        try {
          fallbackReachability = await input.ensureMainGatewayReachable(input.mainGateway, { bypassCache: true })
        }
        catch {}
        if (localFallbackReply && input.isRunActive() && fallbackReachability?.reachable === false) {
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-local-fallback-blocked', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            recoveredChars: localFallbackReply.length,
            actionKind: preparedExecution.runtimeSurface.action?.kind ?? null,
            reason: lastRecoveryError instanceof Error ? lastRecoveryError.message : String(lastRecoveryError ?? 'none'),
            gatewayReachable: fallbackReachability.reachable,
            gatewayReason: fallbackReachability.reason ?? null,
          })
          await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
            level: 'warning',
            category: 'alicization.main-gateway',
            action: 'stream-timeout-local-fallback-blocked',
            message: 'Blocked local timeout fallback because normal visible replies require provider-authored mind output.',
            payload: {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              actionKind: preparedExecution.runtimeSurface.action?.kind ?? null,
              gatewayReachable: fallbackReachability.reachable,
              gatewayReason: fallbackReachability.reason ?? null,
            },
          }))
        }

        if (localFallbackReply && input.isRunActive() && fallbackReachability?.reachable !== false) {
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-local-fallback-blocked', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            actionKind: preparedExecution.runtimeSurface.action?.kind ?? null,
            reason: lastRecoveryError instanceof Error ? lastRecoveryError.message : String(lastRecoveryError ?? 'none'),
            gatewayReachable: fallbackReachability?.reachable ?? null,
            gatewayReason: fallbackReachability?.reason ?? null,
          })
        }

        throw (lastRecoveryError ?? new Error('main-gateway-timeout-recovery'))
      },
      emitRecoveredText: (recoveredReply) => {
        emitResolvedVisibleReply(recoveredReply)
      },
      emitError: (reason) => {
        input.emitError({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          error: reason,
        })
      },
      finish: finishPayload => input.runStateController.finishRun(input.key, {
        ...finishPayload,
        visibleReplyExecution: currentVisibleReplyExecution,
      }),
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      queueScopedAuditLog: input.queueScopedAuditLog,
      turnRuntimeContext: prepared?.turnRuntimeContext ?? null,
    })
  }
}
