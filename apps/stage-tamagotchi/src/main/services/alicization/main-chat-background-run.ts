import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationResidentPerformanceSnapshot,
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
  looksLikeAlicizationStructuredPayloadText,
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
  shouldAlicizationActiveDialogueStayLLMAuthored,
} from './main-chat-active-dialogue-loop'
import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'
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
  finishRun: (key: string, payload: {
    status: 'completed' | 'aborted' | 'failed'
    finishReason: string
    fullText?: string
    error?: string
  }) => void
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

interface AlicizationInlineExecutionReceipt {
  completedAt: number
  sessionId: string
  threadId: string
}

interface AlicizationInlineExecutionSurfaceInput {
  channel: string
  status: 'completed' | 'failed' | 'blocked' | 'cancelled' | 'queued' | 'running'
  goal: string
  summary: string
  outcome: string
}

class AlicizationMindAuthoredReplyRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AlicizationMindAuthoredReplyRequiredError'
  }
}

const executorToolNames = new Set([
  'executor_run_cli',
  'executor_run_codex',
  'executor_run_claude_code',
  'executor_run_openclaw',
])

const terminalExecutionThreadStatuses = new Set([
  'completed',
  'failed',
  'blocked',
  'cancelled',
])

function buildMinimalContextRecoveryMessages(messages: Message[]) {
  if (!Array.isArray(messages) || messages.length <= 6)
    return messages

  const keepIndexes = new Set<number>()
  let preservedSystemCount = 0

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (message?.role !== 'system')
      continue
    if (preservedSystemCount < 3) {
      keepIndexes.add(index)
      preservedSystemCount += 1
    }
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role === 'system') {
      keepIndexes.add(index)
      break
    }
  }

  let preservedTailCount = 0
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'system')
      continue
    keepIndexes.add(index)
    preservedTailCount += 1
    if (preservedTailCount >= 4)
      break
  }

  const compactMessages = messages.filter((_, index) => keepIndexes.has(index))
  return compactMessages.length > 0
    ? compactMessages
    : messages.slice(-6)
}

function deriveAlicizationVisibleReplyText(rawText: string) {
  const normalizedText = typeof rawText === 'string'
    ? rawText.trim()
    : ''
  if (!normalizedText)
    return ''

  const parsed = parseJsonObjectFromText(normalizedText)
  const structuredReply = typeof parsed?.reply === 'string'
    ? parsed.reply.trim()
    : ''
  if (structuredReply)
    return structuredReply

  return looksLikeAlicizationStructuredPayloadText(normalizedText)
    ? ''
    : normalizedText
}

function readInlineExecutionReceipt(result: unknown): AlicizationInlineExecutionReceipt | null {
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return null

  const payload = result as {
    completedAt?: unknown
    sessionId?: unknown
    threadId?: unknown
    threadStatus?: unknown
  }
  const threadStatus = sanitizeText(payload.threadStatus, '')
    .toLowerCase()
  const sessionId = sanitizeText(payload.sessionId, '')
  const threadId = sanitizeText(payload.threadId, '')
  const completedAt = typeof payload.completedAt === 'number' && Number.isFinite(payload.completedAt)
    ? Math.max(0, Math.floor(payload.completedAt))
    : 0

  if (!terminalExecutionThreadStatuses.has(threadStatus) || !sessionId || !threadId || completedAt <= 0)
    return null

  return {
    completedAt,
    sessionId,
    threadId,
  }
}

function asInlineExecutionSurfaceInput(toolName: string, result: unknown): AlicizationInlineExecutionSurfaceInput | null {
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return null

  const payload = result as Record<string, unknown>
  const normalizedToolName = sanitizeText(toolName, '').toLowerCase()
  const selectedChannel = sanitizeText(payload.selectedChannel, '')
    || sanitizeText(payload.channel, '')
    || (normalizedToolName === 'executor_run_cli'
      ? 'cli'
      : normalizedToolName === 'executor_run_codex'
        ? 'codex'
        : normalizedToolName === 'executor_run_claude_code'
          ? 'claude-code'
          : normalizedToolName === 'executor_run_openclaw'
            ? 'openclaw'
            : 'executor')
  const status = sanitizeText(payload.threadStatus, '').toLowerCase()
    || sanitizeText(payload.status, '').toLowerCase()
    || (payload.ok === true ? 'completed' : payload.ok === false ? 'failed' : '')
  const normalizedStatus = (
    status === 'completed'
    || status === 'failed'
    || status === 'blocked'
    || status === 'cancelled'
    || status === 'queued'
    || status === 'running'
  )
    ? status
    : 'failed'
  const summary = sanitizeText(payload.summary, '')
  const output = typeof payload.output === 'string'
    ? payload.output
    : payload.output != null
      ? JSON.stringify(payload.output)
      : ''
  const outcome = sanitizeText(output, '')
  const goal = sanitizeText(payload.goal, '')
    || summary
    || 'the current task'

  return {
    channel: selectedChannel,
    status: normalizedStatus,
    goal,
    summary,
    outcome,
  }
}

function shouldUseExecutionFirstFastPath(input: {
  enforcedExecutionTools: string[]
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  if (!input.prepared.waitForTools)
    return false
  if (input.enforcedExecutionTools.length !== 1)
    return false
  if (!input.enforcedExecutionTools.every(toolName => executorToolNames.has(toolName)))
    return false

  const actionKind = input.prepared.runtimeSurface.action?.kind
  if (actionKind !== 'execute' && actionKind !== 'continue-task')
    return false

  return input.prepared.runtimeSurface.tooling.routingRequired === true
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
    const receipt = readInlineExecutionReceipt(result)
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
    if (toolName && toolCallId && executorToolNames.has(toolName))
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
    if (!prepared || !chatConfig || !input.isRunActive())
      return recoveryResult.fullText

    const surfaceInput = asInlineExecutionSurfaceInput(recoveryResult.toolName, recoveryResult.toolResult)
    if (!surfaceInput)
      return recoveryResult.fullText

    const deterministicStructured = buildAlicizationExecutionPayoffDeterministicStructured({
      mode: 'inline-execution',
      channel: surfaceInput.channel,
      goal: surfaceInput.goal,
      status: surfaceInput.status,
      summary: surfaceInput.summary,
      outcome: surfaceInput.outcome,
      selfContinuityAuthority: buildSelfContinuityAuthorityFromRuntimeSurface(prepared.runtimeSurface.digitalLifeRuntimeSurface),
      hostPersonModel: prepared.runtimeSurface.digitalLifeRuntimeSurface?.memory.hostPersonModel ?? null,
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
        selfContinuityAuthority: buildSelfContinuityAuthorityFromRuntimeSurface(prepared.runtimeSurface.digitalLifeRuntimeSurface),
        hostPersonModel: prepared.runtimeSurface.digitalLifeRuntimeSurface?.memory.hostPersonModel ?? null,
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
          ...buildMinimalContextRecoveryMessages(messages),
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
        selfContinuityAuthority: buildSelfContinuityAuthorityFromRuntimeSurface(prepared.runtimeSurface.digitalLifeRuntimeSurface),
        hostPersonModel: prepared.runtimeSurface.digitalLifeRuntimeSurface?.memory.hostPersonModel ?? null,
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
      }
      await input.appendRuntimeDebugLine('chat-stream.execution-payoff-finished', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        channel: surfaceInput.channel,
        status: surfaceInput.status,
        source: selectedReply.source,
        surfaceReason: selectedReply.reason ?? null,
      })
      return JSON.stringify(structured)
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
      if (reachability?.reachable !== false) {
        throw new AlicizationMindAuthoredReplyRequiredError(
          `mind-authored-execution-payoff-required:${error instanceof Error ? error.message : String(error)}`,
        )
      }
      return JSON.stringify(deterministicStructured)
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
    if (shouldUseExecutionFirstFastPath({
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
          const payoffText = await attemptInlineExecutionPayoff(deterministicRecovery)
          const visiblePayoffText = deriveAlicizationVisibleReplyText(payoffText) || payoffText
          emitStreamEmbodimentMeta(visiblePayoffText)
          input.emitChunk({
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            text: visiblePayoffText,
          })
          await suppressInlineExecutionDeliveries()
          await input.appendRuntimeDebugLine('chat-stream.execution-first-inline-finished', {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            fullTextChars: payoffText.length,
            toolName: deterministicRecovery.toolName,
          })
          input.runStateController.finishRun(input.key, {
            status: 'completed',
            finishReason: 'execution-first-inline',
            fullText: payoffText,
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
    const activeDialogueUsesCompactFastPath = activeDialogueDecision
      && !shouldAlicizationActiveDialogueStayLLMAuthored(activeDialogueDecision)
      && activeDialogueDecision.strategy === 'compact-one-shot'
    if (activeDialogueDecision && !activeDialogueUsesCompactFastPath) {
      await input.appendRuntimeDebugLine('chat-stream.active-dialogue-deferred-to-main-runtime', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        lane: activeDialogueDecision.lane,
        strategy: activeDialogueDecision.strategy,
        reasonCodes: activeDialogueDecision.reasonCodes,
        deferredReason: activeDialogueDecision.strategy !== 'compact-one-shot'
          ? 'infra-only-strategy'
          : 'mind-authored-lane',
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
        const visibleNormalizedReply = deriveAlicizationVisibleReplyText(normalizedReply) || normalizedReply
        emitStreamEmbodimentMeta(visibleNormalizedReply)
        input.emitChunk({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          text: visibleNormalizedReply,
        })
        await input.appendRuntimeDebugLine('chat-stream.active-dialogue-mind-finished', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          lane: activeDialogueDecision.lane,
          strategy: activeDialogueDecision.strategy,
          fullTextChars: normalizedReply.length,
        })
        input.runStateController.finishRun(input.key, {
          status: 'completed',
          finishReason: 'active-dialogue-fast-path',
          fullText: normalizedReply,
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
    })
    if (streamResult.fullText.trim())
      await suppressInlineExecutionDeliveries()
    input.runStateController.finishRun(input.key, {
      status: 'completed',
      finishReason: streamResult.finishReason,
      fullText: streamResult.fullText || undefined,
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
          const payoffText = await attemptInlineExecutionPayoff(deterministicRecovery)
          const visiblePayoffText = deriveAlicizationVisibleReplyText(payoffText) || payoffText
          emitStreamEmbodimentMeta(visiblePayoffText)
          input.emitChunk({
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            text: visiblePayoffText,
          })
          await suppressInlineExecutionDeliveries()
          input.runStateController.finishRun(input.key, {
            status: 'completed',
            finishReason: 'required-tool-recovered',
            fullText: payoffText,
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
              const payoffText = await attemptInlineExecutionPayoff(deterministicRecovery)
              await suppressInlineExecutionDeliveries()
              await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-finished', {
                cardId: normalizedCardId,
                turnId: normalizedTurnId,
                chunkCount: 1,
                rawChunkChars: payoffText.length,
                finalChars: payoffText.length,
                recoveryMode: 'deterministic-required-tool',
              })
              return {
                recoveredText: payoffText,
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
        const timeoutActiveDialogueUsesCompactRecovery
          = !toolingRequired
            && !!timeoutActiveDialogueDecision
            && timeoutActiveDialogueDecision.strategy === 'compact-one-shot'
        if (!toolingRequired && timeoutActiveDialogueDecision && !timeoutActiveDialogueUsesCompactRecovery) {
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-active-dialogue-deferred', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            lane: timeoutActiveDialogueDecision.lane,
            strategy: timeoutActiveDialogueDecision.strategy,
            reasonCodes: timeoutActiveDialogueDecision.reasonCodes,
            deferredReason: timeoutActiveDialogueDecision.strategy !== 'compact-one-shot'
              ? 'infra-only-strategy'
              : 'mind-authored-lane',
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
          const minimalMessages = buildMinimalContextRecoveryMessages(recoveryInput.messages)
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
              recoveredText: normalizedRecoveredText,
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
                  await suppressInlineExecutionDeliveries()
                  return {
                    recoveredText: deterministicRecovery.fullText,
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
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-local-fallback', {
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
            action: 'stream-timeout-local-fallback',
            message: 'Recovered turn with local continuity fallback after stream and one-shot recovery timed out.',
            payload: {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              actionKind: preparedExecution.runtimeSurface.action?.kind ?? null,
              gatewayReachable: fallbackReachability.reachable,
              gatewayReason: fallbackReachability.reason ?? null,
            },
          }))
          return {
            recoveredText: localFallbackReply,
            recoveryMode: 'local-fallback',
          }
        }

        if (localFallbackReply && input.isRunActive()) {
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
      emitRecoveredText: (recoveredText) => {
        const visibleRecoveredText = deriveAlicizationVisibleReplyText(recoveredText) || recoveredText
        emitStreamEmbodimentMeta(visibleRecoveredText)
        input.emitChunk({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          text: visibleRecoveredText,
        })
      },
      emitError: (reason) => {
        input.emitError({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          error: reason,
        })
      },
      finish: finishPayload => input.runStateController.finishRun(input.key, finishPayload),
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      queueScopedAuditLog: input.queueScopedAuditLog,
    })
  }
}
