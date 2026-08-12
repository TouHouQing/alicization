import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationRuntimeDigest,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMainGatewayReachabilitySnapshot } from './main-gateway-health'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  ChatRunState,
  MainGatewayResolvedConfig,
} from './runtime-soul'
import type { RuntimeSurfaceContinuityEvidenceShape } from './runtime-surface-continuity-selection'
import type { AlicizationRuntimeCheckpoint } from './turn-os/checkpoint-store'
import type { AlicizationRuntimeEventScope } from './turn-os/event-store'

import {
  extractAlicizationToolExecutionFailure,
  isAlicizationToolExecutionFailureResult,
} from '@proj-alicization/stage-shared'

import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import {
  armAlicizationMainChatPreparationDeadline,
  raceAlicizationMainChatPreparation,
} from './main-chat-preparation-deadline'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import { runAlicizationMainChatProviderStep } from './main-chat-stream-runner'
import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import {
  mainChatFirstEventTimeoutMs,
  mainChatFirstEventTimeoutWithVisualGroundingMs,
  mainChatPreparationTimeoutMs,
  mainChatProviderContinuationTimeoutMs,
  sanitizeText,
} from './runtime-soul'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import { createAlicizationEventLoop } from './turn-os/event-loop'
import { createAlicizationMainChatParticipant } from './turn-os/main-chat-participant'
import { createAlicizationRuntimeReplyArtifact } from './turn-os/reply-artifact'
import { resolveAlicizationPreparedVisibleReplyExecution, settleAlicizationVisibleReply } from './visible-reply/facade'

type AlicizationRuntimeEmotionalKernelShape = NonNullable<AlicizationRuntimeDigest['emotionalKernel']>

function readRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function readEmotionalKernelSnapshot(raw: unknown): AlicizationRuntimeEmotionalKernelShape | null {
  const candidate = readRecord(raw)
  if (!candidate)
    return null
  if (candidate.version !== 'emotional-kernel-v1')
    return null
  if (
    !sanitizeText(candidate.dominantEmotion, '')
    || !sanitizeText(candidate.initiativeMode, '')
    || !sanitizeText(candidate.memoryRecallMode, '')
    || !sanitizeText(candidate.embodimentTone, '')
  ) {
    return null
  }
  return candidate as unknown as AlicizationRuntimeEmotionalKernelShape
}

export const mainChatBackgroundRunTestInternals = {
  buildPreparedRuntimeDigestFallback,
}

type AlicizationBackgroundFinishPayload = Omit<AlicizationChatFinishEvent, 'cardId' | 'turnId'>

interface AlicizationMainChatRunStateFacade {
  setSessionTraceGetter: (key: string, getter: () => AlicizationRuntimeCallChainSnapshot) => void
  finishRun: (key: string, payload: AlicizationBackgroundFinishPayload) => void
}

interface RunAlicizationMainChatBackgroundOptions {
  key: string
  payload: AlicizationChatStartPayload
  activeCardId: string
  mainGateway: MainGatewayResolvedConfig
  runState: ChatRunState
  prepareTurn: (input: {
    abortSignal: AbortSignal
  }) => Promise<AlicizationPreparedMainChatExecutionResult>
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
  settlePresentedExecutionCallbacks?: (input: {
    cardId: string
    callbacks: NonNullable<AlicizationPreparedMainChatExecutionResult['presentedExecutionCallbacks']>
  }) => Promise<void> | void
  turnLoop: {
    conversationId: string
    userId: string
    persistence: {
      appendRuntimeEvent: (
        scope: AlicizationRuntimeEventScope,
        event: AlicizationRuntimeEventEnvelope,
      ) => Promise<AlicizationRuntimeEventEnvelope>
      saveRuntimeCheckpoint: (
        checkpoint: AlicizationRuntimeCheckpoint,
      ) => Promise<AlicizationRuntimeCheckpoint>
    }
  }
}

function resolvePreferredPreparedRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined,
): AlicizationDigitalLifeRuntimeSurface | null {
  return resolvePreferredRuntimeSurface({
    spineRuntimeSurface: (runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null) as RuntimeSurfaceContinuityEvidenceShape | null,
    preparedRuntimeSurface: (runtimeSurface?.digitalLifeRuntimeSurface ?? null) as RuntimeSurfaceContinuityEvidenceShape | null,
  }) as AlicizationDigitalLifeRuntimeSurface | null
}

function resolvePreparedRuntimeEmotionalKernel(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): AlicizationRuntimeEmotionalKernelShape | null {
  return readEmotionalKernelSnapshot(runtimeSurface?.memory?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.raw?.runtimeDigest?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.cognition?.runtimeDigest?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.dialogue?.runtimeDigest?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.memory?.derivedMindStateBundle?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.memory?.derivedMindStateBundle?.visualPresenceState?.emotionalKernel)
}

function buildPreparedRuntimeDigestFallback(prepared: AlicizationPreparedMainChatExecutionResult | null): AlicizationRuntimeDigest | null {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const runtimeSurface = preferredRuntimeSurface ?? prepared?.runtimeSurface?.digitalLifeRuntimeSurface ?? null
  const emotionalKernel = resolvePreparedRuntimeEmotionalKernel(runtimeSurface)

  if (!emotionalKernel)
    return null

  return {
    version: 'alicization-runtime-digest-v1',
    dominantChannel: 'dialogue',
    activeLoop: null,
    autonomy: null,
    emotionalKernel,
    currentConsciousFrame: null,
    shouldProactivelySpeak: false,
    shouldProactivelyAct: false,
    continuityPressure: 0,
    companionshipPressure: 0,
    rulingMotive: null,
    habitMode: null,
    truthDisciplinePressure: null,
    boundaryPressure: null,
    restProtectionPressure: null,
    returnPressure: null,
    channels: [{
      id: 'dialogue',
      state: 'idle',
      readiness: 0,
      focus: null,
      summary: '',
    }],
    summary: '',
  }
}

export function resolveAlicizationExecutionPayoffContinuityInputs(input: {
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined
}) {
  const continuityRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.runtimeSurface)
  const personStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: continuityRuntimeSurface?.raw?.personStateProjection ?? null,
    runtimeProjection: continuityRuntimeSurface?.memory?.personStateProjection ?? null,
  })
  const hostPersonModel = continuityRuntimeSurface?.memory?.hostPersonModel ?? null
  const projectedSelfContinuityAuthority = resolvePreferredSelfContinuityAuthority({
    bundleAuthority: continuityRuntimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: personStateProjection?.selfContinuityAuthority ?? null,
  })
  let selfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: continuityRuntimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: personStateProjection?.selfContinuityAuthority ?? null,
  })
  ?? projectedSelfContinuityAuthority
  if (!selfContinuityAuthority) {
    try {
      selfContinuityAuthority = buildSelfContinuityAuthorityFromRuntimeSurface(continuityRuntimeSurface)
    }
    catch {
      selfContinuityAuthority = null
    }
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
  let prepared: AlicizationPreparedMainChatExecutionResult | null = null
  let streamMetaEmitter: ReturnType<typeof createAlicizationChatStreamMetaEmitter> | null = null
  let registeredCancelTurn: ChatRunState['cancelTurn']
  const registeredCancellations: Array<Promise<boolean>> = []
  const nonProgressEventTypes = new Set<string>()

  const emitFailure = async (error: unknown) => {
    await handleAlicizationMainChatRunFailure({
      error,
      prepared,
      controller: input.runState.controller,
      mainGateway: input.mainGateway,
      payload: input.payload,
      dispatchBound: input.runState.hasLoggedDispatchBinding === true,
      nonProgressEventTypes,
      recordMainGatewayGenerationTimeout: input.recordMainGatewayGenerationTimeout,
      emitError: (reason, metadata) => {
        input.emitError({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          error: reason,
          ...metadata,
        })
      },
      finish: (finishPayload) => {
        input.runStateController.finishRun(input.key, {
          ...finishPayload,
          visibleReplyCritic: null,
          visibleReplyClosure: null,
        })
      },
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      queueScopedAuditLog: input.queueScopedAuditLog,
    })
  }

  try {
    if (!input.turnLoop)
      throw new TypeError('main chat requires an EventLoop owner')

    const normalizedPayload = input.payload
    const conversationId = sanitizeText(input.turnLoop.conversationId)
    if (!conversationId)
      throw new TypeError('main chat requires an EventLoop owner with a real conversationId')
    let currentVisibleReplyExecution: AlicizationVisibleReplyExecution | null = null

    const settlePresentedExecutionCallbacks = async () => {
      const presentedExecutionCallbacks = prepared?.presentedExecutionCallbacks ?? []
      if (presentedExecutionCallbacks.length === 0)
        return

      try {
        await input.settlePresentedExecutionCallbacks?.({
          cardId: normalizedPayload.cardId,
          callbacks: presentedExecutionCallbacks,
        })
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.execution-callback-settlement-failed', {
          cardId: normalizedPayload.cardId,
          turnId: normalizedPayload.turnId,
          callbackCount: presentedExecutionCallbacks.length,
          reason: error instanceof Error ? error.message : String(error),
        })
        await input.queueScopedAuditLog(normalizedPayload.cardId, {
          level: 'warning',
          category: 'alicization.executor.delivery',
          action: 'inline-surface-settlement-failed',
          message: 'Failed to persist execution callback delivery settlement after a Provider reply.',
          payload: {
            turnId: normalizedPayload.turnId,
            callbackCount: presentedExecutionCallbacks.length,
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    const participant = createAlicizationMainChatParticipant<AlicizationPreparedMainChatExecutionResult>({
      runProviderStep: async (context, runtime) => {
        const providerStep = await runAlicizationMainChatProviderStep({
          payload: input.payload,
          prepared: context.prepared,
          messages: context.providerMessages,
          headers: input.headers,
          controller: input.runState.controller,
          signal: runtime.abortSignal,
          firstEventTimeoutMs: context.prepared.hasVisualGrounding
            ? mainChatFirstEventTimeoutWithVisualGroundingMs
            : mainChatFirstEventTimeoutMs,
          providerContinuationTimeoutMs: mainChatProviderContinuationTimeoutMs,
          isRunActive: input.isRunActive,
          nonProgressEventTypes,
          emitToolCall: input.emitToolCall,
          appendRuntimeDebugLine: input.appendRuntimeDebugLine,
        })
        if (providerStep.kind === 'action')
          return providerStep

        const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
          prepared: context.prepared,
          mode: 'provider-stream',
          providerMindExecuted: true,
          reason: 'turn-event-loop',
        })
        const settled = await settleAlicizationVisibleReply({
          draft: {
            fullText: providerStep.fullText,
            visibleReplyExecution,
          },
          prepared: context.prepared,
          requireProviderMemoryUsage: true,
          allowPlainTextProviderReply: true,
          appendRuntimeDebugLine: input.appendRuntimeDebugLine,
        })
        const artifact = createAlicizationRuntimeReplyArtifact({
          artifactVersion: 1,
          visibleText: settled.visibleText,
          finishReason: providerStep.finishReason,
          fullText: providerStep.fullText,
          visibleReplyExecution: settled.visibleReplyExecution,
          realization: settled.realization,
        })
        currentVisibleReplyExecution = settled.visibleReplyExecution
        return {
          kind: 'reply',
          artifact,
        }
      },
      executeTool: async (action, context, runtime) => {
        const tool = context.prepared.tools?.find(
          candidate => sanitizeText(candidate.function?.name) === action.qualifiedToolName,
        )
        if (!tool)
          throw new Error(`Provider requested unavailable tool "${action.qualifiedToolName}"`)
        if (!action.toolCallId)
          throw new Error('Provider tool action requires a real toolCallId')

        const result = await tool.execute(action.input, {
          abortSignal: runtime.abortSignal,
          messages: context.providerMessages,
          toolCallId: action.toolCallId,
        })
        const toolFailure = isAlicizationToolExecutionFailureResult(result)
          ? extractAlicizationToolExecutionFailure(result, action.qualifiedToolName)
          : null
        if (toolFailure) {
          throw Object.assign(new Error(toolFailure.message), {
            name: 'AlicizationToolExecutionError',
            failureKind: 'tool-execution',
            toolName: toolFailure.toolName,
            errorCode: toolFailure.code,
          })
        }

        input.emitToolResult({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          toolCallId: action.toolCallId,
          toolName: action.qualifiedToolName,
          result,
        })
        return {
          actionId: action.actionId,
          observationId: `${action.actionId}:observation`,
          toolCallId: action.toolCallId,
          terminal: true,
          outcome: 'success',
          output: result,
        }
      },
      publishReply: async ({ cardId, text, turnId }) => {
        if (!input.isRunActive())
          return
        input.incrementChunkStats(text)
        input.emitChunk({
          cardId,
          turnId,
          text,
          origin: 'provider',
          learningPolicy: {
            allowLongTermCondensation: true,
            allowPersonaLearning: true,
            allowTraining: false,
          },
          failureSurface: null,
        })
        streamMetaEmitter?.emit(text)
      },
    })
    const eventLoop = createAlicizationEventLoop({
      persistence: input.turnLoop.persistence,
      participant,
    })
    const scope: AlicizationRuntimeEventScope = {
      cardId: normalizedPayload.cardId,
      conversationId,
      turnId: normalizedPayload.turnId,
      userId: input.turnLoop.userId,
    }
    registeredCancelTurn = (reason) => {
      const cancellation = eventLoop.cancelTurn(scope, reason)
      registeredCancellations.push(cancellation)
      return cancellation
    }
    input.runState.cancelTurn = registeredCancelTurn
    const result = await eventLoop.runTurn({
      scope,
      deliveryOwner: 'inline',
      signal: input.runState.controller.signal,
      turnInput: {
        payload: {
          cardId: normalizedPayload.cardId,
          turnId: normalizedPayload.turnId,
        },
        conversationId,
        prepare: async (runtime) => {
          const clearPreparationDeadline = armAlicizationMainChatPreparationDeadline({
            controller: input.runState.controller,
            timeoutMs: mainChatPreparationTimeoutMs,
            onTimeout: () => {
              void input.appendRuntimeDebugLine('chat-stream.preparation-timeout-fired', {
                cardId: input.payload.cardId,
                turnId: input.payload.turnId,
                timeoutMs: mainChatPreparationTimeoutMs,
              })
            },
          })
          let nextPrepared: AlicizationPreparedMainChatExecutionResult
          try {
            nextPrepared = await raceAlicizationMainChatPreparation({
              preparationPromise: input.prepareTurn({
                abortSignal: runtime.abortSignal,
              }),
              signal: runtime.abortSignal,
            })
          }
          finally {
            clearPreparationDeadline()
          }
          if (!input.isRunActive())
            throw new DOMException('Alicization chat run is no longer active', 'AbortError')

          prepared = nextPrepared
          input.runStateController.setSessionTraceGetter(input.key, nextPrepared.getSessionTrace)
          currentVisibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
            prepared: nextPrepared,
          })
          streamMetaEmitter = createAlicizationChatStreamMetaEmitter({
            cardId: normalizedPayload.cardId,
            turnId: normalizedPayload.turnId,
            getGovernance: () => prepared?.governance ?? null,
            getThought: () => null,
            getVisibleReplyExecution: () => currentVisibleReplyExecution,
            getDigitalLifeSpine: () => projectAlicizationDigitalLifeSpineDigest(prepared?.runtimeSurface?.digitalLifeSpine ?? null),
            getRuntimeDigest: () => buildPreparedRuntimeDigestFallback(prepared),
            getResidentPerformance: () => null,
            getPerformanceManifest: () => prepared?.performanceManifest ?? null,
            getExplicitPerformance: () => null,
            emit: input.emitMeta,
          })
          streamMetaEmitter.emit('', { force: true })
          try {
            await Promise.resolve(input.recordPreparedMindTrace?.({
              payload: normalizedPayload,
              prepared: nextPrepared,
            }))
          }
          catch (error) {
            await input.appendRuntimeDebugLine('chat-start.prepared-mind-trace-failed', {
              cardId: input.runState.cardId,
              turnId: input.runState.turnId,
              reason: error instanceof Error ? error.message : String(error),
            })
          }
          return nextPrepared
        },
      },
    })

    if (
      result.status === 'cancelled'
      && registeredCancellations.length > 0
      && (await Promise.all(registeredCancellations)).some(Boolean)
    ) {
      return
    }
    if (result.status !== 'completed')
      throw result.cause ?? new Error(result.error ?? `main chat turn ${result.status}`)
    const completedPrepared = prepared as AlicizationPreparedMainChatExecutionResult | null
    if (!completedPrepared)
      throw new Error('main chat EventLoop completed without prepared context')
    const finalReply = result.replyArtifact
    if (!finalReply)
      throw new Error('main chat EventLoop completed without a settled Provider reply')

    await settlePresentedExecutionCallbacks()

    input.runStateController.finishRun(input.key, {
      status: 'completed',
      finishReason: finalReply.finishReason,
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
      memoryFailures: completedPrepared.memoryFailures,
      fullText: finalReply.fullText,
      visibleReplyExecution: finalReply.visibleReplyExecution,
      visibleReplyRealization: finalReply.realization,
      visibleReplyCritic: finalReply.realization.critic as AlicizationChatFinishEvent['visibleReplyCritic'],
      visibleReplyClosure: finalReply.realization.closure as AlicizationChatFinishEvent['visibleReplyClosure'],
    })
  }
  catch (error) {
    await emitFailure(error)
  }
  finally {
    if (input.runState.cancelTurn === registeredCancelTurn)
      delete input.runState.cancelTurn
  }
}
