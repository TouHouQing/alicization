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

import { deriveAlicizationResidentPerformanceSnapshot } from '@proj-alicization/stage-shared'

import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { extractAllowedToolNamesFromToolChoice } from './main-chat-runtime-surface'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import { runAlicizationMainChatStream } from './main-chat-stream-runner'
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
}

export async function runAlicizationMainChatBackground(
  input: RunAlicizationMainChatBackgroundOptions,
) {
  let prepared: AlicizationPreparedMainChatExecutionResult | null = null
  let chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']> | null = null
  let messages: Message[] = []
  let tools: PreparedMainChatExecution['tools']
  let toolChoice: PreparedMainChatExecution['toolChoice']
  let timeoutRecoveryMode: AlicizationMainChatTimeoutRecoveryMode = 'original'
  let timeoutRecoveryMs = mainChatTimeoutRecoveryMs
  const nonProgressEventTypes = new Set<string>()
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
  const streamMetaEmitter = createAlicizationChatStreamMetaEmitter({
    cardId: input.payload.cardId,
    turnId: input.payload.turnId,
    getGovernance: () => prepared?.governance ?? null,
    getDigitalLifeSpine: () => projectAlicizationDigitalLifeSpineDigest(
      prepared?.runtimeSurface.digitalLifeSpine ?? null,
    ),
    getResidentPerformance: () => resolveResidentPerformanceFromPrepared(),
    getPerformanceManifest: () => prepared?.performanceManifest ?? null,
    emit: input.emitMeta,
  })
  const emitStreamEmbodimentMeta = streamMetaEmitter.emit

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
      emitToolCall: input.emitToolCall,
      emitToolResult: input.emitToolResult,
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
    input.runStateController.finishRun(input.key, {
      status: 'completed',
      finishReason: streamResult.finishReason,
      fullText: streamResult.fullText || undefined,
    })
  }
  catch (error) {
    await handleAlicizationMainChatRunFailure({
      error,
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
        const normalizedCardId = normalizeCardId(input.payload.cardId ?? input.activeCardId)
        const normalizedTurnId = sanitizeText(input.payload.turnId)
        await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-started', {
          cardId: normalizedCardId,
          turnId: normalizedTurnId,
          timeoutMs: recoveryInput.timeoutMs,
          recoveryMode: timeoutRecoveryMode,
          toolCount: Array.isArray(recoveryInput.tools) ? recoveryInput.tools.length : 0,
          messageCount: recoveryInput.messages.length,
        })
        const effectiveRecoveryInput = timeoutRecoveryMode === 'tools-disabled'
          ? {
              ...recoveryInput,
              tools: undefined,
              toolChoice: undefined,
            }
          : recoveryInput
        const recoveredText = await recoverAlicizationMainChatFromTimeout(effectiveRecoveryInput)
        await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-finished', {
          cardId: normalizedCardId,
          turnId: normalizedTurnId,
          chunkCount: recoveredText ? 1 : 0,
          rawChunkChars: recoveredText.length,
          finalChars: recoveredText.length,
          recoveryMode: timeoutRecoveryMode,
        })
        return recoveredText
      },
      emitRecoveredText: (recoveredText) => {
        emitStreamEmbodimentMeta(recoveredText)
        input.emitChunk({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          text: recoveredText,
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
