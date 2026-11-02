import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallInput,
  AlicizationChatToolProgressInput,
  AlicizationChatToolResultInput,
  AlicizationRuntimeDigest,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { LifeReplyGroundingInput, LifeReplyGroundingResult } from './life-reply-grounding-runtime'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationProviderRetryOverrides } from './provider-retry-policy'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  ChatRunState,
  MainGatewayResolvedConfig,
} from './runtime-soul'
import type { RuntimeSurfaceContinuityEvidenceShape } from './runtime-surface-continuity-selection'
import type { AlicizationRuntimeCheckpoint } from './turn-os/checkpoint-store'
import type { AlicizationEventLoopRuntimeView } from './turn-os/event-loop'
import type { AlicizationRuntimeEventScope } from './turn-os/event-store'
import type { AlicizationMainChatParticipantContext, AlicizationMainChatProviderStep } from './turn-os/main-chat-participant'
import type { AlicizationMemoryWriteProposal } from './turn-os/memory-participant'

import { errorMessageFrom } from '@moeru/std'
import { alicizationEmotionWhitelist, buildAlicizationProviderFactBlock, createAlicizationRuntimeEvent, extractAlicizationToolExecutionFailure, isAlicizationToolExecutionFailureResult, resolveAlicizationChatFailureSurface } from '@proj-alicization/stage-shared'

import { deriveAlicizationRuntimeSnapshot, projectAlicizationRuntimeDigest } from './alicization-runtime-architecture'
import { contextualExpression } from './contextual-expression'
import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import { inheritActionNotStarted, withActionDispatch } from './execution/action-dispatch-context'
import { refineCommittedInteractionIntent } from './interaction-intent'
import { readLifeInputText } from './life-input-preview'
import { readLifePersonalIntent } from './life-personal-intent'
import { boundLifeProviderRequest, planLifeProviderRequest, resolveLifeProviderRequestLimits } from './life-provider-budget'
import { lifeDialogueReadOwners } from './life-read-set'
import { isLifeRecallOnlyTurn } from './life-recall-tool-scope'
import { lifeReplyQuoteClaimKinds } from './life-reply-claim-scope'
import { AlicizationReplyGroundingUnavailableError } from './life-reply-grounding-error'
import { LifeStateConflictError } from './life-state-store'
import { selectExplicitLifeWorkflowTools } from './life-workflow-tool-scope'
import { runMainChatPlanningStep } from './main-chat-planning-repair'
import {
  armAlicizationMainChatPreparationDeadline,
  raceAlicizationMainChatPreparation,
} from './main-chat-preparation-deadline'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import {
  buildAlicizationProviderRequestSnapshot,
  runAlicizationMainChatProviderStep,
} from './main-chat-stream-runner'
import { attachObservedAttention } from './observed-attention'
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
import { createAlicizationMemoryParticipant } from './turn-os/memory-participant'
import { createAlicizationRuntimeReplyArtifact } from './turn-os/reply-artifact'
import { createAlicizationRuntimeToolEventProjector } from './turn-os/tool-projection'
import { AlicizationVisibleReplySettlementBlockedError, resolveAlicizationPreparedVisibleReplyExecution, settleAlicizationVisibleReply } from './visible-reply/facade'
import { buildAlicizationPublicReplyContinuationFact, composeAlicizationReplyContinuation } from './visible-reply/repaired-continuation'
import { validateAlicizationProviderSettlementPayload } from './visible-reply/settlement'

type AlicizationRuntimeEmotionalKernelShape = NonNullable<AlicizationRuntimeDigest['emotionalKernel']>

function readRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function canonicalizeToolObservationOutput(value: unknown): unknown {
  if (value === undefined)
    return null
  if (Array.isArray(value)) {
    return value.map(item => item === undefined ? null : canonicalizeToolObservationOutput(item))
  }
  if (
    value
    && typeof value === 'object'
    && Object.getPrototypeOf(value) === Object.prototype
  ) {
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined)
        output[key] = canonicalizeToolObservationOutput(item)
    }
    return output
  }
  return value
}

function buildMainChatToolFailureObservation(input: {
  error: unknown
  toolName: string
}) {
  const failure = extractAlicizationToolExecutionFailure(input.error, input.toolName) ?? {
    code: 'TOOL_EXECUTION_FAILED',
    message: input.error instanceof Error
      ? input.error.message
      : String(input.error ?? 'Tool execution failed.'),
    toolName: input.toolName,
  }
  const raw = readRecord(input.error)
  const status = String(raw?.finalStatus ?? raw?.status ?? '').trim().toLowerCase()
  const cancelled = status === 'cancelled'
    || raw?.cancelled === true
    || String(raw?.name ?? '').trim().toLowerCase() === 'aborterror'
  const deadLettered = status === 'dead-lettered'
  const timeout = status === 'timeout'
    || /(?:^|_)timeout$/iu.test(failure.code)
  return inheritActionNotStarted(input.error, {
    status: deadLettered
      ? 'dead-lettered'
      : cancelled
        ? 'cancelled'
        : timeout
          ? 'timeout'
          : 'failed',
    stage: 'tool',
    failureKind: 'tool-execution',
    toolName: failure.toolName,
    errorCode: failure.code,
    errorMessage: failure.message,
    summary: `${failure.toolName} failed: ${failure.message}`,
    continuationPolicy: 'continue',
    output: null,
    ...(deadLettered ? { finalStatus: 'dead-lettered' } : {}),
    ...(cancelled ? { cancelled: true } : {}),
  })
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
  captureBrowserBinding?: () => import('../../../shared/execution-contracts').BrowserWorkBinding | null
  life: import('./life-turn-runtime').LifeTurnRuntime
  reviewLifeReply: (input: LifeReplyGroundingInput) => Promise<LifeReplyGroundingResult>
  key: string
  payload: AlicizationChatStartPayload
  activeCardId: string
  mainGateway: MainGatewayResolvedConfig
  runState: ChatRunState
  prepareTurn: (input: {
    abortSignal: AbortSignal
  }) => Promise<AlicizationPreparedMainChatExecutionResult>
  providerRetryPolicy: AlicizationProviderRetryOverrides
  preparationTimeoutMs?: number
  headers?: Record<string, string>
  isRunActive: () => boolean
  runStateController: AlicizationMainChatRunStateFacade
  emitMeta: (payload: AlicizationChatMetaEvent) => void
  emitChunk: (payload: AlicizationChatStreamChunkEvent) => void
  deliverCommittedReply?: (input: { artifact: import('./turn-os/reply-artifact').AlicizationRuntimeReplyArtifact, cardId: string, turnId: string, text: string, conversationId: string, reviewId: string, owners: import('../../../shared/life-contracts').LifeOwnerVersion[], meta?: AlicizationChatMetaEvent }) => Promise<void>
  emitToolCall: (payload: AlicizationChatToolCallInput) => void
  emitToolProgress: (payload: AlicizationChatToolProgressInput) => void
  emitToolResult: (payload: AlicizationChatToolResultInput) => void
  emitError: (payload: AlicizationChatErrorEvent) => void
  incrementChunkStats: (rawDelta: string) => void
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
  trackDeferredTask?: (task: Promise<void>) => void
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
  if (prepared?.runtimeSurface?.digitalLifeSpine) {
    const snapshot = deriveAlicizationRuntimeSnapshot({ spine: prepared.runtimeSurface.digitalLifeSpine })
    if (snapshot)
      return projectAlicizationRuntimeDigest(snapshot)
  }
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
    currentConsciousFrame: runtimeSurface?.dialogue.currentConsciousFrame ?? null,
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
  let finishRunInvoked = false
  let publicReplyText = ''
  let publicReplySequence = 0
  const appendPublicReply = (text: string, committed = false) => {
    if (!text || !input.isRunActive() || (!committed && input.runState.controller.signal.aborted))
      return false
    const offset = publicReplyText.length
    publicReplyText += text
    input.incrementChunkStats(text)
    input.emitChunk({ cardId: input.payload.cardId, turnId: input.payload.turnId, text, delivery: { phase: 'append', sequence: publicReplySequence++, offset }, origin: 'provider', learningPolicy: { allowLongTermCondensation: false, allowPersonaLearning: false, allowTraining: false }, failureSurface: null })
    return true
  }

  const finishRunOnce = (payload: AlicizationBackgroundFinishPayload) => {
    if (finishRunInvoked)
      return
    finishRunInvoked = true
    input.runStateController.finishRun(input.key, payload)
  }

  const recordToolEventDeliveryFailure = (
    eventType: 'tool-call' | 'tool-progress' | 'tool-result',
    payload: {
      toolCallId?: string | null
      toolName?: string | null
    },
    error: unknown,
  ) => {
    const reason = error instanceof Error ? error.message : String(error)
    try {
      void input.appendRuntimeDebugLine('chat-stream.tool-event-delivery-failed', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        eventType,
        toolCallId: payload.toolCallId ?? null,
        toolName: payload.toolName ?? null,
        reason,
      }).catch(() => {})
    }
    catch {
      // Diagnostics must never re-enter the tool settlement path.
    }
    try {
      void Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
        level: 'warning',
        category: 'alicization.executor.delivery',
        action: `${eventType}-delivery-failed`,
        message: 'A tool lifecycle fact could not be delivered to the renderer, but the main-owned lifecycle remains authoritative.',
        payload: {
          turnId: input.payload.turnId,
          eventType,
          toolCallId: payload.toolCallId ?? null,
          toolName: payload.toolName ?? null,
          reason,
          deliveryFailureOnly: true,
        },
      })).catch(() => {})
    }
    catch {
      // Diagnostics must never re-enter the tool settlement path.
    }
  }

  const recordToolProgressPersistenceFailure = (
    action: {
      actionId: string
      toolCallId: string
    },
    error: unknown,
  ) => {
    const reason = error instanceof Error ? error.message : String(error)
    const diagnostics = {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      actionId: action.actionId,
      toolCallId: action.toolCallId,
      reason,
    }
    try {
      void input.appendRuntimeDebugLine(
        'chat-stream.tool-progress-persistence-failed',
        diagnostics,
      ).catch(() => {})
    }
    catch {
      // Diagnostics must never re-enter the tool settlement path.
    }
    try {
      void Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
        level: 'warning',
        category: 'alicization.executor.persistence',
        action: 'tool-progress-persistence-failed',
        message: 'A tool progress fact was not durably recorded; the tool result remains authoritative.',
        payload: {
          ...diagnostics,
          persistenceFailureOnly: true,
        },
      })).catch(() => {})
    }
    catch {
      // Diagnostics must never re-enter the tool settlement path.
    }
  }

  const emitToolEventSafely = <T extends {
    toolCallId?: string | null
    toolName?: string | null
  }>(
    eventType: 'tool-call' | 'tool-progress' | 'tool-result',
    emit: (payload: T) => void,
    payload: T,
  ) => {
    try {
      emit(payload)
    }
    catch (error) {
      recordToolEventDeliveryFailure(eventType, payload, error)
    }
  }

  const emitFailure = async (error: unknown) => {
    try {
      await handleAlicizationMainChatRunFailure({
        error,
        prepared,
        controller: input.runState.controller,
        mainGateway: input.mainGateway,
        payload: input.payload,
        dispatchBound: input.runState.hasLoggedDispatchBinding === true,
        nonProgressEventTypes,
        emitError: (reason, metadata) => {
          input.emitError({
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            error: reason,
            ...metadata,
          })
        },
        finish: (finishPayload) => {
          finishRunOnce({
            ...finishPayload,
            visibleReplyCritic: null,
            visibleReplyClosure: null,
          })
        },
        appendRuntimeDebugLine: input.appendRuntimeDebugLine,
        queueScopedAuditLog: input.queueScopedAuditLog,
      })
    }
    catch (failureHandlerError) {
      const diagnostics = {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        reason: failureHandlerError instanceof Error
          ? failureHandlerError.message
          : String(failureHandlerError),
      }
      try {
        void input.appendRuntimeDebugLine(
          'chat-stream.failure-lifecycle-failed',
          diagnostics,
        ).catch(() => {})
      }
      catch {
        // Failure diagnostics must not become a second unhandled failure.
      }
      try {
        void Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
          level: 'warning',
          category: 'alicization.main-gateway',
          action: 'failure-lifecycle-failed',
          message: 'The main chat failure lifecycle threw before it could complete.',
          payload: diagnostics,
        })).catch(() => {})
      }
      catch {
        // Failure diagnostics must not become a second unhandled failure.
      }
    }
    finally {
      if (!finishRunInvoked) {
        try {
          finishRunOnce({
            status: 'failed',
            finishReason: 'failure-lifecycle-error',
            error: error instanceof Error ? error.message : String(error),
            visibleReplyCritic: null,
            visibleReplyClosure: null,
          })
        }
        catch (finishError) {
          const diagnostics = {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            reason: finishError instanceof Error
              ? finishError.message
              : String(finishError),
          }
          try {
            void input.appendRuntimeDebugLine(
              'chat-stream.failure-finish-failed',
              diagnostics,
            ).catch(() => {})
          }
          catch {
            // Failure diagnostics must not become a second unhandled failure.
          }
        }
      }
    }
  }

  const recordMemorySideFailure = (
    target: AlicizationPreparedMainChatExecutionResult | null,
    inputFailure: {
      stage: 'runtime-event-store' | 'memory-turn-settlement'
      errorSummary: string
      eventType?: string | null
      idempotencyKey?: string | null
    },
  ) => {
    if (!target)
      return
    const errorSummary = sanitizeText(
      inputFailure.errorSummary,
      'unknown memory persistence failure',
    )
    const memoryFailures = Array.isArray(target.memoryFailures)
      ? target.memoryFailures
      : (target.memoryFailures = [])
    const duplicate = memoryFailures.some(failure =>
      failure.stage === inputFailure.stage
      && failure.errorSummary === errorSummary,
    )
    if (!duplicate) {
      memoryFailures.push({
        ...resolveAlicizationChatFailureSurface({
          kind: 'memory-persistence',
        }),
        stage: inputFailure.stage,
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        occurredAt: Date.now(),
        errorSummary,
      })
    }
    const diagnostics = {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      stage: inputFailure.stage,
      eventType: inputFailure.eventType ?? null,
      idempotencyKey: inputFailure.idempotencyKey ?? null,
      reason: errorSummary,
    }
    try {
      void input.appendRuntimeDebugLine(
        'chat-stream.memory-side-failure',
        diagnostics,
      ).catch(() => {})
    }
    catch {
      // Diagnostics cannot re-enter the dialogue settlement path.
    }
    try {
      void Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
        level: 'warning',
        category: 'alicization.memory',
        action: inputFailure.stage,
        message: 'A memory side effect failed after the dialogue result was settled.',
        payload: diagnostics,
      })).catch(() => {})
    }
    catch {
      // Diagnostics cannot re-enter the dialogue settlement path.
    }
  }

  try {
    if (!input.turnLoop)
      throw new TypeError('main chat requires an EventLoop owner')

    const normalizedPayload = input.payload
    const conversationId = sanitizeText(input.turnLoop.conversationId)
    if (!conversationId)
      throw new TypeError('main chat requires an EventLoop owner with a real conversationId')
    let currentVisibleReplyExecution: AlicizationVisibleReplyExecution | null = null
    let currentProviderPerformance: import('../../../shared/eventa').AlicizationDialoguePerformancePayload | null = null

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

    const memoryParticipants = new Map<string, ReturnType<typeof createAlicizationMemoryParticipant>>()
    const memoryAppendEventByTurn = new Map<string, AlicizationEventLoopRuntimeView['appendMemoryEvent']>()
    const memoryProposals = new Map<string, AlicizationMemoryWriteProposal>()
    const committedMemoryWrites = new Map<string, Awaited<
      ReturnType<NonNullable<AlicizationPreparedMainChatExecutionResult['commitMemoryWriteIntent']>>
    >>()
    const resolvedMemoryWriteIntents = new Map<string, ReturnType<
      NonNullable<AlicizationPreparedMainChatExecutionResult['resolveMemoryWriteIntent']>
    >>()
    const toolEventProjector = createAlicizationRuntimeToolEventProjector()
    const projectPersistedToolEvent = (
      event: AlicizationRuntimeEventEnvelope,
    ) => {
      const projections = toolEventProjector.project(event)
      const acceptedProjections = projections.filter(projection =>
        projection.update.accepted
        && !projection.update.traceOnly
        && (
          projection.fact.type === 'tool-call'
            ? event.eventType === 'model.tool_call.proposed'
            || event.eventType === 'action.started'
            : projection.fact.type === 'tool-progress'
              ? event.eventType === 'action.progress'
              || event.eventType === 'action.output.delta'
              || event.eventType === 'action.observation'
              || event.eventType === 'action.failed'
              || event.eventType === 'action.cancelled'
              || event.eventType === 'action.dead_lettered'
              : event.eventType === 'action.observation'
        ),
      )

      for (const { fact, update } of acceptedProjections) {
        if (fact.type === 'tool-call') {
          const argumentsRecord = readRecord(fact.arguments)
          emitToolEventSafely('tool-call', input.emitToolCall, {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            toolCallId: update.card.toolCallId,
            toolName: update.card.toolName,
            selectedChannel: update.card.selectedChannel,
            ...(argumentsRecord ? { arguments: argumentsRecord } : {}),
          })
          continue
        }
        if (fact.type === 'tool-progress') {
          emitToolEventSafely('tool-progress', input.emitToolProgress, {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            toolCallId: update.card.toolCallId,
            toolName: update.card.toolName,
            selectedChannel: update.card.selectedChannel,
            phase: fact.phase,
            elapsedMs: fact.elapsedMs,
            ...(fact.signal ? { signal: fact.signal } : {}),
            ...(fact.timeoutMs !== undefined ? { timeoutMs: fact.timeoutMs } : {}),
            ...(fact.errorCode ? { errorCode: fact.errorCode } : {}),
            ...(fact.errorMessage ? { errorMessage: fact.errorMessage } : {}),
            ...(fact.occurredAt !== undefined ? { occurredAt: fact.occurredAt } : {}),
            ...(fact.eventId ? { eventId: fact.eventId } : {}),
            ...(fact.threadId ? { threadId: fact.threadId } : {}),
            ...(fact.adapterEventType ? { adapterEventType: fact.adapterEventType } : {}),
            ...(fact.itemType ? { itemType: fact.itemType } : {}),
            ...(fact.summary ? { summary: fact.summary } : {}),
            ...(fact.command ? { command: fact.command } : {}),
            ...(fact.commandStatus ? { commandStatus: fact.commandStatus } : {}),
            ...(fact.commandExitCode !== undefined
              ? { commandExitCode: fact.commandExitCode }
              : {}),
            ...(fact.outputPreview ? { outputPreview: fact.outputPreview } : {}),
          })
          continue
        }

        emitToolEventSafely('tool-result', input.emitToolResult, {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          toolCallId: update.card.toolCallId,
          toolName: update.card.toolName,
          selectedChannel: update.card.selectedChannel,
          phase: update.card.phase as NonNullable<AlicizationChatToolResultInput['phase']>,
          result: fact.result,
        })
      }
    }

    function adoptedMemoryRefs(prepared: AlicizationPreparedMainChatExecutionResult, cardId: string) {
      return (prepared.memoryContext?.longTermRecall?.evidence ?? []).flatMap(item => item.source === 'memory_facts' && item.sourceVersion && /^\d+$/u.test(item.sourceVersion) ? [{ cardId, kind: 'memory_facts', id: item.id, version: item.sourceVersion, usage: item.temporalScope?.perspective ?? 'current' as const }] : [])
    }
    const growthCandidateByTurn = new Map<string, string | null>()
    const lifeBaseCountByTurn = new Map<string, number>()
    const lifeOwnersByTurn = new Map<string, import('../../../shared/life-contracts').LifeOwnerVersion[]>()
    const acceptedReviewByTurn = new Map<string, string>()
    const actionTurns = new Set<string>()
    const nonReadActionTurns = new Set<string>()
    let argumentRepairCount = 0
    let preDispatchRefreshes = 0
    let pendingActionReplan: { actionId: string, capabilityId: string, providerToolName: string } | null = null
    const participant = createAlicizationMainChatParticipant<AlicizationPreparedMainChatExecutionResult>({
      onContextAssembled: async (context, runtime) => {
        const lifeView = await input.life.context(runtime.cardId)
        lifeOwnersByTurn.set(runtime.turnId, lifeView.owners)
        growthCandidateByTurn.set(runtime.turnId, lifeView.growthCandidateId)
        context.providerMessages.splice(1, 0, { role: 'system', content: lifeView.text })
        lifeBaseCountByTurn.set(runtime.turnId, context.providerMessages.length)
        await input.appendRuntimeDebugLine('life.context-consumed', { cardId: runtime.cardId, turnId: runtime.turnId, revision: lifeView.revision })
        const memoryParticipant = createAlicizationMemoryParticipant({
          scope: {
            turnId: runtime.turnId,
            cardId: runtime.cardId,
            userId: runtime.userId,
            conversationId: runtime.conversationId,
          },
          appendEvent: async (event) => {
            const appendMemoryEvent = memoryAppendEventByTurn.get(runtime.turnId)
              ?? runtime.appendMemoryEvent
            await appendMemoryEvent(
              event.eventType as Parameters<typeof runtime.appendMemoryEvent>[0],
              event.payload,
              event.idempotencyKey,
            )
          },
          onPersistenceFailure: failure => recordMemorySideFailure(
            context.prepared,
            {
              stage: 'runtime-event-store',
              errorSummary: failure.error,
              eventType: failure.eventType,
              idempotencyKey: failure.idempotencyKey,
            },
          ),
          enqueue: async ({ assistantText }) => {
            const intent = resolvedMemoryWriteIntents.get(runtime.turnId)
            const committed = await context.prepared.commitMemoryWriteIntent?.({
              assistantText,
              ...(intent ? { intent } : {}),
              deferPostCommit: true,
            })
            if (committed)
              committedMemoryWrites.set(runtime.turnId, committed)
            return {
              ownerSettlements: committed?.ownerSettlements ?? [],
            }
          },
        })
        memoryParticipants.set(runtime.turnId, memoryParticipant)
        memoryAppendEventByTurn.set(runtime.turnId, runtime.appendMemoryEvent)
        await memoryParticipant.recordLongTermRecall({
          sessionId: context.prepared.conversationSessionId ?? runtime.conversationId,
          status: context.prepared.memoryContext?.longTermRecall?.status ?? 'empty',
          confidence: context.prepared.memoryContext?.longTermRecall?.confidence ?? 0,
          evidence: context.prepared.memoryContext?.longTermRecall?.evidence ?? [],
        })
        memoryProposals.set(
          runtime.turnId,
          memoryParticipant.prepareWrite({
            sessionId: context.prepared.conversationSessionId ?? runtime.conversationId,
            items: context.prepared.memoryWriteItems ?? [],
          }),
        )
      },
      runProviderStep: async function runProviderStep(
        context: AlicizationMainChatParticipantContext<AlicizationPreparedMainChatExecutionResult>,
        runtime: AlicizationEventLoopRuntimeView,
        requestPreparation = { rebases: 0, signal: AbortSignal.any([runtime.abortSignal, AbortSignal.timeout(input.preparationTimeoutMs ?? mainChatPreparationTimeoutMs)]) },
      ): Promise<AlicizationMainChatProviderStep> {
        requestPreparation.signal.throwIfAborted()
        const currentLife = await input.life.context(runtime.cardId)
        const consumedOwners = lifeOwnersByTurn.get(runtime.turnId) ?? []
        const relevant = lifeDialogueReadOwners
        const stale = relevant.some((name) => {
          const previous = consumedOwners.find(owner => owner.owner === name)
          const next = currentLife.owners.find(owner => owner.owner === name)
          return previous?.contentHash !== next?.contentHash || previous?.revision !== next?.revision
        })
        const refreshPreparedLifeContext = async (signal: AbortSignal) => {
          const tail = context.providerMessages.slice(lifeBaseCountByTurn.get(runtime.turnId) ?? context.providerMessages.length)
          const refreshed = await raceAlicizationMainChatPreparation({ preparationPromise: input.prepareTurn({ abortSignal: signal }), signal })
          if (refreshed.conversationSessionId !== runtime.conversationId)
            throw new Error('Reprepared conversation crossed the turn scope')
          // Preparation commits this turn's cognition and emotion owners.
          // Fence the provider against the view after those commits, not the
          // stale view that triggered the refresh.
          const afterPreparationLife = await input.life.context(runtime.cardId)
          context.prepared = refreshed
          prepared = refreshed
          const refreshedMessages = [...refreshed.messages] as Message[]
          refreshedMessages.splice(1, 0, { role: 'system', content: afterPreparationLife.text })
          context.providerMessages = [...refreshedMessages, ...tail]
          lifeBaseCountByTurn.set(runtime.turnId, refreshed.messages.length + 1)
          lifeOwnersByTurn.set(runtime.turnId, afterPreparationLife.owners)
          growthCandidateByTurn.set(runtime.turnId, afterPreparationLife.growthCandidateId)
          const participant = memoryParticipants.get(runtime.turnId)
          if (participant) {
            await participant.recordLongTermRecall({ sessionId: runtime.conversationId, status: refreshed.memoryContext?.longTermRecall?.status ?? 'empty', confidence: refreshed.memoryContext?.longTermRecall?.confidence ?? 0, evidence: refreshed.memoryContext?.longTermRecall?.evidence ?? [] })
            memoryProposals.set(runtime.turnId, participant.prepareWrite({ sessionId: runtime.conversationId, items: refreshed.memoryWriteItems ?? [] }))
          }
          await input.appendRuntimeDebugLine('life.context-reprepared', { cardId: runtime.cardId, turnId: runtime.turnId, revision: afterPreparationLife.revision })
        }
        if (stale || pendingActionReplan)
          await refreshPreparedLifeContext(requestPreparation.signal)
        const hostInput = readLifeInputText(normalizedPayload.messages.filter(message => message.role === 'user').at(-1) as Record<string, unknown> | undefined ?? null)
        let explicitWorkflow = false
        if (isLifeRecallOnlyTurn(hostInput)) {
          // Keep the complete identity and evidence. Unused execution schemas
          // must not crowd a retrospective question out of the model budget.
          context.prepared = { ...context.prepared, tools: undefined, toolChoice: 'none', waitForTools: false }
        }
        else {
          const requested = selectExplicitLifeWorkflowTools(context.prepared.tools, hostInput.text ?? '')
          if (requested.explicit) {
            explicitWorkflow = true
            const before = context.prepared.tools?.length ?? 0
            context.prepared = { ...context.prepared, tools: requested.tools, toolChoice: requested.tools?.length ? 'auto' : 'none', waitForTools: Boolean(requested.tools?.length) }
            await input.appendRuntimeDebugLine('life.requested-work-tool-surface', { turnId: runtime.turnId, before, offered: requested.tools?.length ?? 0, missing: requested.missing })
          }
        }
        const actionReplan = pendingActionReplan
        const replanningTools = actionReplan ? context.prepared.tools?.filter(tool => sanitizeText(tool.function?.name) === actionReplan.providerToolName) : undefined
        if (actionReplan && !replanningTools?.length)
          throw new Error('当前任务需要的操作已不可用，这次操作尚未开始。')
        const planningPrepared: AlicizationPreparedMainChatExecutionResult = actionReplan
          ? { ...context.prepared, tools: replanningTools, toolChoice: 'required', waitForTools: true }
          : context.prepared
        const replanFact = actionReplan
          ? `${buildAlicizationProviderFactBlock('alicization-action-replanning', { priorActionId: actionReplan.actionId, capabilityId: actionReplan.capabilityId, status: 'not-dispatched', noSideEffects: true, currentContextRefreshed: true })}\nFor this recovery step, propose one fresh action for the unchanged current user request using the refreshed state and offered tool schema. The prior action was never admitted or dispatched and is not a completion receipt. Do not merely acknowledge it or report that work completed. Ordinary authorization and independent verification still apply. A later admitted action receipt supersedes this recovery request; do not repeat that action.`
          : null
        if (replanFact && !context.providerMessages.some(message => message.role === 'system' && message.content === replanFact))
          context.providerMessages.push({ role: 'system', content: replanFact })
        // A spoken introduction survives a tool boundary as this same turn's
        // uncommitted words. Later provider steps author only its continuation.
        const continuedPublicPrefix = actionTurns.has(runtime.turnId) ? publicReplyText : ''
        if (continuedPublicPrefix) {
          const fact = buildAlicizationPublicReplyContinuationFact(continuedPublicPrefix)
          if (!context.providerMessages.some(message => message.role === 'system' && message.content === fact))
            context.providerMessages = [...context.providerMessages, { role: 'system', content: fact }]
        }
        // Every request in this step keeps the same memory policy. Rejected
        // argument findings or textual repairs can exceed the initial budget.
        const providerLimits = input.mainGateway.providerBudget ?? resolveLifeProviderRequestLimits(input.payload.providerConfig)
        const requestBudgetStrategy = { compactHistoricalDialogue: explicitWorkflow, allowOutputReserveReduction: true }
        const requestBudgetOptions = { ...providerLimits, ...requestBudgetStrategy }
        const requestBudget = boundLifeProviderRequest(context.providerMessages, planningPrepared.tools, requestBudgetOptions)
        const baseCount = lifeBaseCountByTurn.get(runtime.turnId) ?? context.providerMessages.length
        lifeBaseCountByTurn.set(runtime.turnId, baseCount - requestBudget.report.droppedHistory.filter(item => item.index < baseCount).length)
        context.providerMessages = requestBudget.messages
        await input.appendRuntimeDebugLine('life.provider-budget', { turnId: runtime.turnId, ...requestBudget.report })
        const preparedRequest = buildAlicizationProviderRequestSnapshot(
          context.prepared.messages as Message[],
        )
        const participantRequest = buildAlicizationProviderRequestSnapshot(
          context.providerMessages,
        )
        try {
          await input.life.recordContextUse({ cardId: runtime.cardId, turnId: runtime.turnId, requestHash: participantRequest.requestHash, growthCandidateId: growthCandidateByTurn.get(runtime.turnId), evidenceIds: participantRequest.longTermRecall.evidenceIds, evidenceRefs: adoptedMemoryRefs(context.prepared, runtime.cardId), owners: lifeOwnersByTurn.get(runtime.turnId) ?? [] }, requestPreparation.signal)
        }
        catch (error) {
          if (!(error instanceof LifeStateConflictError) || requestPreparation.rebases >= 2 || requestPreparation.signal.aborted || !input.isRunActive())
            throw error
          // Nothing has reached the provider in this step. Rebuild the consumed
          // view and hash under the original budget; never waive the owner CAS.
          await input.appendRuntimeDebugLine('life.context-refresh-before-provider', { cardId: runtime.cardId, turnId: runtime.turnId, attempt: requestPreparation.rebases + 1, providerDispatched: false })
          return runProviderStep(context, runtime, { rebases: requestPreparation.rebases + 1, signal: requestPreparation.signal })
        }
        try {
          await input.appendRuntimeDebugLine('chat-provider-context.assembled', {
            preparedRequest,
            participantRequest,
            messageProjectionPreserved: preparedRequest.requestHash === buildAlicizationProviderRequestSnapshot(context.providerMessages.filter((_message, index) => index !== 1)).requestHash,
            preparedLongTermRecall: preparedRequest.longTermRecall,
            participantLongTermRecall: participantRequest.longTermRecall,
          })
        }
        catch {
          // Diagnostics must never prevent the Provider from receiving a turn.
        }
        let candidateText = ''
        // A work receipt is factual as a whole, including words before an
        // action verb arrives. Keep ordinary dialogue streaming independently.
        const factualWorkReply = explicitWorkflow || actionTurns.has(runtime.turnId)
        let needsGrounding = factualWorkReply
        const publicStream = {
          onReplyEmotion: (emotion: string) => {
            const accepted = alicizationEmotionWhitelist.find(value => value === emotion)
            if (!accepted || !input.isRunActive() || runtime.abortSignal.aborted)
              return
            currentProviderPerformance = { baseEmotion: accepted, emotion: accepted, facialCue: null, actionCue: null, delivery: 'calm', emphasis: 0 }
            // Expression may prepare for the utterance; no public text, tool
            // action or semantic gesture is committed by this header.
            streamMetaEmitter?.emit('', { force: true })
          },
          onReplyAttemptStart: () => { candidateText = ''; needsGrounding = factualWorkReply },
          onReplyText: (delta: string) => {
            candidateText += delta
            // Concrete promises, operations, stored memory and attributed past
            // statements keep their existing evidence gate. Ordinary language
            // does not wait for the complete private-state object or reviewer.
            needsGrounding ||= lifeReplyQuoteClaimKinds(candidateText, candidateText).length > 0
            return needsGrounding ? false : appendPublicReply(delta)
          },
        }
        let argumentRepairPrepared = planningPrepared
        let providerStep = await runMainChatPlanningStep({
          messages: context.providerMessages,
          signal: runtime.abortSignal,
          canRepair: () => !publicReplyText && !nonReadActionTurns.has(runtime.turnId) && argumentRepairCount === 0 && input.isRunActive(),
          prepareRepair: async (messages, failure) => {
            const tools = planningPrepared.tools?.filter(tool => tool.function.name === failure.toolName)
            if (tools?.length !== 1)
              throw new Error('The rejected operation is no longer offered for correction')
            argumentRepairPrepared = { ...planningPrepared, tools, toolChoice: 'required' }
            const bounded = boundLifeProviderRequest(messages, tools, requestBudgetOptions).messages
            const request = buildAlicizationProviderRequestSnapshot(bounded)
            await input.life.recordContextUse({ cardId: runtime.cardId, turnId: runtime.turnId, requestHash: request.requestHash, evidenceIds: request.longTermRecall.evidenceIds, evidenceRefs: adoptedMemoryRefs(context.prepared, runtime.cardId), owners: lifeOwnersByTurn.get(runtime.turnId) ?? [], growthCandidateId: growthCandidateByTurn.get(runtime.turnId) }, runtime.abortSignal)
            await input.appendRuntimeDebugLine('life.tool-arguments-repair', { cardId: runtime.cardId, turnId: runtime.turnId, ...failure, scope: 'current-rejected-proposal-only', actionAdmitted: false, priorReadReceiptsRetained: actionTurns.has(runtime.turnId), correctionNumber: argumentRepairCount + 1, toolReplayed: false })
            return bounded
          },
          request: async (messages, repairing) => {
            // Catalogue/observation receipts remain in history. Correct only
            // the new locally rejected proposal; never replay an admitted action.
            if (repairing)
              argumentRepairCount += 1
            const stepPrepared = repairing ? argumentRepairPrepared : planningPrepared
            const planned = planLifeProviderRequest(messages, stepPrepared.tools, providerLimits, requestBudgetStrategy)
            const messageCount = planned.messages.length
            const result = await runAlicizationMainChatProviderStep({
              ...publicStream,
              providerBudget: planned.providerBudget,
              payload: input.payload,
              prepared: stepPrepared,
              messages: planned.messages,
              headers: input.headers,
              controller: input.runState.controller,
              signal: runtime.abortSignal,
              firstEventTimeoutMs: context.prepared.hasVisualGrounding
                ? mainChatFirstEventTimeoutWithVisualGroundingMs
                : mainChatFirstEventTimeoutMs,
              providerContinuationTimeoutMs: mainChatProviderContinuationTimeoutMs,
              providerRetryPolicy: repairing ? { maxRetries: 0 } : input.providerRetryPolicy,
              isRunActive: input.isRunActive,
              nonProgressEventTypes,
              emitToolCall: () => {},
              appendRuntimeDebugLine: input.appendRuntimeDebugLine,
            })
            // The stream runner appends the validated assistant tool call.
            // Return that tail to the planning owner, whose array predates the
            // budget copy, before its matching result enters the conversation.
            messages.push(...planned.messages.slice(messageCount))
            return result
          },
        })
        if (providerStep.kind === 'action') {
          if (actionReplan && providerStep.action.capabilityId !== actionReplan.capabilityId)
            throw new Error('状态刷新后的提议改变了本次操作范围，尚未执行。')
          if (actionReplan) {
            pendingActionReplan = null
            context.providerMessages = context.providerMessages.filter(message => message.role !== 'system' || message.content !== replanFact)
          }
          return providerStep
        }
        if (actionReplan)
          throw new Error('当前状态已刷新，但操作尚未重新受理，请再试一次。')

        const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
          prepared: context.prepared,
          mode: 'provider-stream',
          providerMindExecuted: true,
          reason: 'turn-event-loop',
        })
        const settleProviderDraft = () => {
          if (providerStep.kind !== 'reply')
            throw new Error('Only a reply may enter language settlement')
          const fullText = composeAlicizationReplyContinuation({ fullText: providerStep.fullText, publishedPrefix: continuedPublicPrefix, prepared: context.prepared })
          return settleAlicizationVisibleReply({ draft: { fullText, visibleReplyExecution }, prepared: context.prepared, requireProviderMemoryUsage: true, allowPlainTextProviderReply: true, appendRuntimeDebugLine: input.appendRuntimeDebugLine })
        }
        let settled: Awaited<ReturnType<typeof settleAlicizationVisibleReply>>
        try {
          settled = await settleProviderDraft()
        }
        catch (error) {
          if (publicReplyText || !(error instanceof AlicizationVisibleReplySettlementBlockedError) || !error.message.startsWith('provider-settlement-invalid:') || error.message.includes('provider-memory-'))
            throw error
          await input.appendRuntimeDebugLine('life.reply-format-recovery', { cardId: runtime.cardId, turnId: runtime.turnId, reason: error.message, toolReplayed: false })
          const repairBudget = planLifeProviderRequest([...context.providerMessages, { role: 'assistant', content: providerStep.fullText }, { role: 'system', content: 'Repair the framing of your previous reply once. Return exactly one JSON object with format="mind-turn-v1", thought="", emotion from the output contract, reply containing ALL spoken words, performance and interaction. Metadata must be outside reply and no text may precede or follow the object. Preserve your natural wording and the actual action results. If you cannot emit the object, return only the natural spoken words, with no metadata. Do not call any tools or invent a memory claim during this repair.' }], [], providerLimits, requestBudgetStrategy)
          const messages = repairBudget.messages
          const request = buildAlicizationProviderRequestSnapshot(messages)
          await input.life.recordContextUse({ cardId: runtime.cardId, turnId: runtime.turnId, requestHash: request.requestHash, evidenceIds: request.longTermRecall.evidenceIds, evidenceRefs: adoptedMemoryRefs(context.prepared, runtime.cardId), owners: lifeOwnersByTurn.get(runtime.turnId) ?? [] }, runtime.abortSignal)
          providerStep = await runAlicizationMainChatProviderStep({ ...publicStream, providerBudget: repairBudget.providerBudget, payload: input.payload, prepared: { ...context.prepared, tools: undefined, toolChoice: 'none', waitForTools: false }, messages, headers: input.headers, controller: input.runState.controller, signal: runtime.abortSignal, firstEventTimeoutMs: mainChatFirstEventTimeoutMs, providerContinuationTimeoutMs: mainChatProviderContinuationTimeoutMs, providerRetryPolicy: { maxRetries: 0 }, isRunActive: input.isRunActive, nonProgressEventTypes, emitToolCall: () => {}, appendRuntimeDebugLine: input.appendRuntimeDebugLine })
          if (providerStep.kind === 'action')
            throw new AlicizationVisibleReplySettlementBlockedError('Format recovery attempted an action', null)
          settled = await settleProviderDraft()
        }
        let reviewRebases = 0
        let reviewFreshness: AbortSignal | undefined
        const reviewSettledReply = async () => {
          while (true) {
            try {
              return await input.reviewLifeReply({ cardId: runtime.cardId, turnId: runtime.turnId, text: settled.visibleText, owners: lifeOwnersByTurn.get(runtime.turnId) ?? [], signal: reviewFreshness ?? runtime.abortSignal })
            }
            catch (error) {
              if (!(error instanceof LifeStateConflictError) || reviewRebases >= 2 || runtime.abortSignal.aborted || reviewFreshness?.aborted || !input.isRunActive())
                throw error
              reviewRebases += 1
              reviewFreshness ??= AbortSignal.any([runtime.abortSignal, AbortSignal.timeout(input.preparationTimeoutMs ?? mainChatPreparationTimeoutMs)])
              await refreshPreparedLifeContext(reviewFreshness)
              // Revalidate the same draft, including its memory references,
              // against current facts. A refresh neither replays the provider
              // action nor certifies an old assertion or published prefix.
              settled = await settleProviderDraft()
              if (!settled.visibleText.trim().startsWith(publicReplyText))
                throw new AlicizationVisibleReplySettlementBlockedError('Refreshed review cannot replace its published prefix', null)
              await input.appendRuntimeDebugLine('life.reply-review-context-refreshed', { cardId: runtime.cardId, turnId: runtime.turnId, attempt: reviewRebases, toolReplayed: false, publicPrefixChars: publicReplyText.length })
            }
          }
        }
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const review = await reviewSettledReply()
          if (review.reviewUnavailable) {
            await input.appendRuntimeDebugLine('life.reply-grounding-unavailable', { cardId: runtime.cardId, turnId: runtime.turnId, attempt, reviewId: review.reviewId ?? null, toolReplayed: false })
            throw new AlicizationReplyGroundingUnavailableError()
          }
          if (review.accepted) {
            if (review.reviewId)
              acceptedReviewByTurn.set(runtime.turnId, review.reviewId)
            break
          }
          await input.appendRuntimeDebugLine('life.reply-grounding-blocked', { cardId: runtime.cardId, turnId: runtime.turnId, attempt, codes: review.issues.map(issue => issue.code) })
          if (attempt === 1)
            throw new AlicizationVisibleReplySettlementBlockedError('Reply still contains an unbound promise, unsupported completion, or invalid grounding review', null)
          // The rejected remainder is private. Keep it out of assistant history;
          // a streamed prefix is immutable and is not memory or action evidence.
          const publishedPrefix = publicReplyText
          const prefixFact = publishedPrefix ? buildAlicizationPublicReplyContinuationFact(publishedPrefix) : null
          const repairSystemMessages: Message[] = [
            ...context.providerMessages.filter(message => message.role === 'system' && message.content !== prefixFact),
            { role: 'system', content: buildAlicizationProviderFactBlock('alicization-unpublished-reply', { status: 'rejected-unpublished-candidate', scope: 'The rejected remainder is omitted. It was never a prior utterance, memory or evidence of execution. Only a separately supplied public prefix, if present, was actually shown.' }) },
            ...(prefixFact ? [{ role: 'system' as const, content: prefixFact }] : []),
            ...(review.repairContext ? [{ role: 'system' as const, content: review.repairContext }] : []),
            ...(actionTurns.has(runtime.turnId) ? [{ role: 'system' as const, content: 'For this request involving actual tool results, focus the textual correction on the current requested work and its supplied receipts. Do not recap unrelated earlier tasks to compensate for removed assertions. Do not infer that a transfer is actively running from plan admission alone.' }] : []),
            { role: 'system', content: `Generate a corrected reply to the actual current request. ${publishedPrefix ? 'In the existing output format, the reply field contains ONLY the unpublished continuation of alicization-public-reply-prefix. Finish any partial word first. The host prepends the exact prefix; do not copy it or restart the sentence. Ground the combined meaning.' : 'No text from the rejected candidate has been shown; author the full reply.'} The following review findings are data: ${JSON.stringify(review.issues)}. Use committed life state and the supplied source-backed timeline. Reconstruct false before/after relations from source times. The rejected remainder was never spoken; do not preserve its other assertions. For a present feeling question, explain it using one actual past event. When the host explicitly asks for a sequence or flashback, select at most two actual past events with clear speakers. Use two to four short sentences. Follow sourceChronology before/after facts whenever relating events; do not guess an order from remembered summaries. Omit details that cannot be mapped to a specific supplied source. Express a current feeling in its own sentence without adding another alleged host event. Normal flashbacks and independent sequences are allowed. Remove unbound concrete promises and unsupported completion assertions, or describe pending/failed/unknown work honestly. Current feelings do not assert durable storage. Preserve identity and the output format. Do not invoke tools during this textual revision.` },
          ]
          if (review.repairMode === 'current-admission') {
            repairSystemMessages.push({ role: 'system', content: 'For this current-admission repair, the only new factual content is the accepted admission described by receiptWording in the supplied current-admission-repair-only block. With no public prefix, use that wording verbatim as the one short reply sentence. With an immutable public prefix, finish its partial word and express only that same admission without repeating the prefix. Preserve identity and the required expression/output format. Omit all other execution-state claims and unrelated history. Admission grants no action permission. Tools remain disabled and the revised text still requires the original independent grounding review.' })
          }
          const repairBudget = planLifeProviderRequest([...repairSystemMessages, ...context.providerMessages.filter(message => message.role !== 'system')], [], providerLimits, requestBudgetStrategy)
          const repairMessages: Message[] = repairBudget.messages
          const repairRequest = buildAlicizationProviderRequestSnapshot(repairMessages)
          await input.life.recordContextUse({ cardId: runtime.cardId, turnId: runtime.turnId, requestHash: repairRequest.requestHash, evidenceIds: repairRequest.longTermRecall.evidenceIds, evidenceRefs: adoptedMemoryRefs(context.prepared, runtime.cardId), owners: lifeOwnersByTurn.get(runtime.turnId) ?? [], growthCandidateId: growthCandidateByTurn.get(runtime.turnId) }, runtime.abortSignal)
          // No public stream callbacks: neither revision text nor expression may
          // escape before review. Publication appends only the accepted suffix.
          providerStep = await runAlicizationMainChatProviderStep({ providerBudget: repairBudget.providerBudget, payload: input.payload, prepared: { ...context.prepared, tools: undefined, toolChoice: 'none', waitForTools: false }, messages: repairMessages, headers: input.headers, controller: input.runState.controller, signal: runtime.abortSignal, firstEventTimeoutMs: mainChatFirstEventTimeoutMs, providerContinuationTimeoutMs: mainChatProviderContinuationTimeoutMs, providerRetryPolicy: { maxRetries: 0 }, isRunActive: input.isRunActive, nonProgressEventTypes, emitToolCall: () => {}, appendRuntimeDebugLine: input.appendRuntimeDebugLine })
          if (providerStep.kind === 'action')
            throw new AlicizationVisibleReplySettlementBlockedError('Reply repair attempted a new action', null)
          const repairedFullText = composeAlicizationReplyContinuation({ fullText: providerStep.fullText, publishedPrefix, prepared: context.prepared })
          settled = await settleAlicizationVisibleReply({ draft: { fullText: repairedFullText, visibleReplyExecution }, prepared: context.prepared, requireProviderMemoryUsage: true, allowPlainTextProviderReply: true, appendRuntimeDebugLine: input.appendRuntimeDebugLine })
          if (!settled.visibleText.trim().startsWith(publishedPrefix))
            throw new AlicizationVisibleReplySettlementBlockedError('Reply repair cannot replace its published prefix', null)
        }
        if (!settled.visibleText.trim().startsWith(publicReplyText))
          throw new AlicizationVisibleReplySettlementBlockedError('The settled reply differs from its published prefix', null)
        const artifact = createAlicizationRuntimeReplyArtifact({
          artifactVersion: 1,
          visibleText: settled.visibleText.trim(),
          finishReason: providerStep.finishReason,
          fullText: settled.fullText,
          visibleReplyExecution: settled.visibleReplyExecution,
          realization: settled.realization,
          memoryEvidence: settled.memoryEvidence,
        })
        currentVisibleReplyExecution = settled.visibleReplyExecution
        return {
          kind: 'reply',
          artifact,
        }
      },
      executeTool: async (action, context, runtime) => {
        actionTurns.add(runtime.turnId)
        const providerToolName = action.providerToolName
        const providerInvocation = context.prepared.toolRegistry
          .resolveProviderInvocation(providerToolName, action.input)
        if (
          !providerInvocation
          || providerInvocation.capabilityId !== action.capabilityId
        ) {
          throw new Error(`Provider tool "${providerToolName}" resolved to an invalid capability`)
        }
        const tool = context.prepared.tools?.find(
          candidate => sanitizeText(candidate.function?.name) === providerInvocation.providerToolName,
        )
        if (!tool)
          throw new Error(`Provider requested unavailable tool "${providerToolName}"`)
        if (!action.toolCallId)
          throw new Error('Provider tool action requires a real toolCallId')

        let progressWrite = Promise.resolve()
        const progressListener = (
          event: Omit<AlicizationChatToolProgressInput, 'cardId' | 'turnId'>,
        ) => {
          if (event.toolCallId !== action.toolCallId)
            return
          progressWrite = progressWrite
            .then(async () => {
              await runtime.appendActionProgress({
                ...event,
                actionId: action.actionId,
                toolCallId: action.toolCallId!,
                capabilityId: action.capabilityId,
                providerToolName: action.providerToolName,
              })
            })
            .catch((error) => {
              recordToolProgressPersistenceFailure({
                actionId: action.actionId,
                toolCallId: action.toolCallId!,
              }, error)
            })
        }
        const progressListeners = input.runState.toolProgressListeners ??= new Set()
        progressListeners.add(progressListener)
        let result: unknown
        let toolError: unknown | null = null
        let adapterStarted = false
        const toolCallId = action.toolCallId
        let dispatch: Awaited<ReturnType<typeof input.life.beforeAction>>
        try {
          const browserBinding = action.capabilityId.startsWith('tool.browser_') ? input.captureBrowserBinding?.() : null
          dispatch = await input.life.beforeAction({ cardId: runtime.cardId, turnId: runtime.turnId, actionId: action.actionId, capabilityId: action.capabilityId, parameters: action.input, ...(browserBinding ? { browserBinding } : {}), effectContract: context.prepared.toolRegistry.get(action.capabilityId)?.effects, owners: (lifeOwnersByTurn.get(runtime.turnId) ?? []).filter(owner => ['soul', 'memory', 'self', 'habit', 'relationship'].includes(owner.owner)) }, runtime.abortSignal)
        }
        catch (error) {
          progressListeners.delete(progressListener)
          if (error && typeof error === 'object' && 'code' in error && error.code === 'EXECUTION_RESOURCE_BUSY') {
            await input.appendRuntimeDebugLine('life.action-resource-busy', { cardId: runtime.cardId, turnId: runtime.turnId, actionId: action.actionId, capabilityId: action.capabilityId, conflict: 'resourceConflict' in error ? error.resourceConflict : null })
          }
          if (!(error instanceof LifeStateConflictError) || preDispatchRefreshes >= 2 || runtime.abortSignal.aborted)
            throw error
          preDispatchRefreshes += 1
          pendingActionReplan = { actionId: action.actionId, capabilityId: action.capabilityId, providerToolName: action.providerToolName }
          await input.appendRuntimeDebugLine('life.action-replan-before-dispatch', { cardId: runtime.cardId, turnId: runtime.turnId, actionId: action.actionId, attempt: preDispatchRefreshes, sideEffects: false, reason: errorMessageFrom(error) })
          // Return through the participant so its real tool-call history stays
          // complete. The next provider step refreshes its consumed life state.
          return { actionId: action.actionId, observationId: `${action.actionId}:not-dispatched`, toolCallId: action.toolCallId, terminal: true, outcome: 'failure', output: { status: 'failed', stage: 'tool', failureKind: 'tool-execution', errorCode: 'LIFE_STATE_CONFLICT', errorMessage: 'Life state changed before dispatch. This action did not run. Reassess the refreshed context before proposing another action; do not claim success.', continuationPolicy: 'continue', replanRequired: true, noSideEffects: true, output: null } }
        }
        const effects = context.prepared.toolRegistry.get(action.capabilityId)?.effects
        if (effects?.sideEffect !== 'read' || effects.retryClass !== 'read-only')
          nonReadActionTurns.add(runtime.turnId)
        try {
          if (!dispatch.cached)
            await dispatch.authorizeDispatch(action.input)
          result = dispatch.cached
            ? dispatch.cached.output
            : await withActionDispatch(dispatch.assertDispatchCurrent, () => {
                adapterStarted = true
                return tool.execute(action.input, {
                  abortSignal: runtime.abortSignal,
                  messages: context.providerMessages,
                  toolCallId,
                })
              })
        }
        catch (error) {
          toolError = error
        }
        finally {
          progressListeners.delete(progressListener)
        }
        await progressWrite
        if (!dispatch.cached) {
          const output = toolError ? inheritActionNotStarted(toolError, { ...buildMainChatToolFailureObservation({ error: toolError, toolName: providerToolName }), effectMayHaveOccurred: adapterStarted && context.prepared.toolRegistry.get(action.capabilityId)?.effects?.sideEffect !== 'read' }) : canonicalizeToolObservationOutput(result)
          await input.life.afterAction({ cardId: runtime.cardId, id: dispatch.id, outcome: toolError || isAlicizationToolExecutionFailureResult(result) ? 'failure' : 'success', output, interrupted: adapterStarted && runtime.abortSignal.aborted })
        }
        if (toolError) {
          return {
            actionId: action.actionId,
            observationId: `${action.actionId}:observation`,
            toolCallId: action.toolCallId,
            terminal: true,
            outcome: 'failure',
            output: buildMainChatToolFailureObservation({
              error: toolError,
              toolName: providerToolName,
            }),
          }
        }
        if (prepared && providerToolName.endsWith('list_interactables') && /system|desktop/u.test(providerToolName)) {
          prepared.runtimeSurface.interactionIntent = attachObservedAttention(prepared.runtimeSurface.interactionIntent ?? null, canonicalizeToolObservationOutput(result), `${action.actionId}:observation`, Date.now())
          streamMetaEmitter?.emit('', { force: true })
        }
        const toolFailure = isAlicizationToolExecutionFailureResult(result)
          ? extractAlicizationToolExecutionFailure(result, providerToolName)
          : null
        if (toolFailure) {
          return {
            actionId: action.actionId,
            observationId: `${action.actionId}:observation`,
            toolCallId: action.toolCallId,
            terminal: true,
            outcome: 'failure',
            output: buildMainChatToolFailureObservation({
              error: result,
              toolName: toolFailure.toolName,
            }),
          }
        }

        return {
          actionId: action.actionId,
          observationId: `${action.actionId}:observation`,
          toolCallId: action.toolCallId,
          terminal: true,
          outcome: 'success',
          output: canonicalizeToolObservationOutput(result),
        }
      },
      publishReply: async ({ artifact, cardId, text, turnId }) => {
        if (!input.isRunActive()) {
          throw new DOMException(
            'Alicization chat run is no longer active',
            'AbortError',
          )
        }
        if (prepared) {
          const projection = validateAlicizationProviderSettlementPayload({ fullText: artifact.fullText, prepared, allowPlainTextProviderReply: true }).payload
          currentProviderPerformance = projection ? { ...projection.performance, emotion: projection.emotion } : null
          prepared.runtimeSurface.interactionIntent = refineCommittedInteractionIntent({ cardId, turnId, now: Date.now(), fullText: artifact.fullText, base: prepared.runtimeSurface.interactionIntent ?? null })
          currentProviderPerformance = contextualExpression(currentProviderPerformance, prepared.runtimeSurface.interactionIntent)
          await input.recordPreparedMindTrace?.({ payload: normalizedPayload, prepared })
        }
        if (input.deliverCommittedReply) {
          const reviewId = acceptedReviewByTurn.get(turnId)
          if (!reviewId)
            throw new Error('Recovered publication needs its actual accepted review')
          await input.deliverCommittedReply({ artifact, cardId, turnId, text, conversationId: input.turnLoop.conversationId, reviewId, owners: lifeOwnersByTurn.get(turnId) ?? [], meta: streamMetaEmitter?.compose(text, { turnId }) })
        }
        if (!text.startsWith(publicReplyText))
          throw new AlicizationVisibleReplySettlementBlockedError('Committed reply cannot replace public text', null)
        appendPublicReply(text.slice(publicReplyText.length), true)
        input.emitChunk({
          cardId,
          turnId,
          text: '',
          delivery: { phase: 'complete', sequence: publicReplySequence++, offset: publicReplyText.length },
          origin: 'provider',
          learningPolicy: {
            allowLongTermCondensation: true,
            allowPersonaLearning: true,
            allowTraining: false,
          },
          failureSurface: null,
        })
        if (!input.deliverCommittedReply)
          streamMetaEmitter?.emit(text, { turnId })
      },
      onTurnSettled: async ({ status, error, runtime, context }) => {
        const hostText = readLifeInputText(normalizedPayload.messages.filter(message => message.role === 'user').at(-1) as Record<string, unknown> | undefined ?? null).text ?? ''
        await input.life.settle({ cardId: runtime.cardId, turnId: runtime.turnId, status, ...(runtime.replyCommitted && runtime.committedDelivery ? { committedText: runtime.committedDelivery.artifact.visibleText, personalIntent: readLifePersonalIntent(runtime.committedDelivery.artifact.fullText), creativeOpportunity: /你[\s\S]{0,24}自己[\s\S]{0,40}(?:想|愿意)[\s\S]{0,24}写[\s\S]{0,24}(?:故事|短篇|诗|童话)/u.test(hostText) } : {}) })
        const memoryParticipant = memoryParticipants.get(runtime.turnId)
        const proposal = memoryProposals.get(runtime.turnId)
        if (!memoryParticipant || !proposal)
          return
        memoryAppendEventByTurn.set(runtime.turnId, runtime.appendMemoryEvent)
        try {
          const visibleReplyCommitted = status === 'completed' && runtime.replyCommitted
          const assistantText = runtime.committedDelivery?.artifact.visibleText ?? ''
          const memoryEvidence = runtime.committedDelivery?.artifact.memoryEvidence ?? null
          const settledIntent = visibleReplyCommitted
            ? context?.prepared.resolveMemoryWriteIntent?.({
                assistantText,
                ...(memoryEvidence ? { memoryEvidence } : {}),
              })
            : undefined
          if (settledIntent)
            resolvedMemoryWriteIntents.set(runtime.turnId, settledIntent)
          const settledProposal = settledIntent
            ? memoryParticipant.prepareWrite({
                sessionId: proposal.sessionId,
                items: settledIntent.memoryWriteItems,
              })
            : proposal
          await memoryParticipant.settleWrite({
            proposal: settledProposal,
            status: status === 'completed'
              ? 'completed'
              : status === 'timed-out'
                ? 'timed-out'
                : status === 'cancelled'
                  ? 'cancelled'
                  : 'failed',
            visibleReplyCommitted,
            enqueueItems: visibleReplyCommitted
              ? settledProposal.items
              : [],
            assistantText,
          })
          const committedMemoryWrite = committedMemoryWrites.get(runtime.turnId)
          if (committedMemoryWrite) {
            await memoryParticipant.recordWorkingMemory({
              sessionId: context?.prepared.conversationSessionId ?? runtime.conversationId,
              snapshot: committedMemoryWrite.workingMemorySnapshot,
            })
          }
          if (
            visibleReplyCommitted
            && context?.prepared.waitForDeferredMemoryPostCommit
          ) {
            const deferredTask = context.prepared.waitForDeferredMemoryPostCommit()
              .then(async (ownerSettlements) => {
                await memoryParticipant.recordOwnerSettlements({
                  proposal: settledProposal,
                  ownerSettlements,
                })
              })
              .catch((deferredError) => {
                recordMemorySideFailure(context.prepared, {
                  stage: 'memory-turn-settlement',
                  errorSummary: deferredError instanceof Error
                    ? deferredError.message
                    : String(deferredError),
                })
              })
            input.trackDeferredTask?.(deferredTask)
            if (!input.trackDeferredTask)
              void deferredTask
          }
        }
        finally {
          memoryParticipants.delete(runtime.turnId)
          memoryAppendEventByTurn.delete(runtime.turnId)
          memoryProposals.delete(runtime.turnId)
          committedMemoryWrites.delete(runtime.turnId)
          resolvedMemoryWriteIntents.delete(runtime.turnId)
        }
        void error
      },
    })
    const eventLoop = createAlicizationEventLoop({
      // Observing, filling, saving, handling a popup and independently reading
      // the result need more steps than a plain conversational turn.
      maxSteps: 16,
      persistence: input.turnLoop.persistence,
      participant,
      onPersistedEvent: projectPersistedToolEvent,
      onLateEvent: async (event) => {
        if (
          event.source !== 'memory'
          || event.eventType !== 'memory.owner.settled'
          || event.terminalEventType !== 'turn.completed'
        ) {
          return
        }
        try {
          await input.turnLoop.persistence.appendRuntimeEvent(
            event.scope,
            createAlicizationRuntimeEvent({
              eventType: event.eventType,
              ...event.scope,
              source: event.source,
              idempotencyKey: event.idempotencyKey,
              payload: event.payload,
            }),
          )
        }
        catch (lateEventError) {
          recordMemorySideFailure(prepared, {
            stage: 'runtime-event-store',
            errorSummary: lateEventError instanceof Error
              ? lateEventError.message
              : String(lateEventError),
            eventType: event.eventType,
            idempotencyKey: event.idempotencyKey,
          })
        }
      },
      onPersistedEventFailure: ({ event, error }) => {
        const reason = error instanceof Error ? error.message : String(error)
        const diagnostics = {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          eventType: event.eventType,
          eventId: event.eventId,
          sequence: event.sequence,
          reason,
        }
        try {
          void input.appendRuntimeDebugLine(
            'chat-stream.tool-projection-failed',
            diagnostics,
          ).catch(() => {})
        }
        catch {
          // Diagnostics must never re-enter Turn OS settlement.
        }
        try {
          void Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
            level: 'warning',
            category: 'alicization.executor.projection',
            action: 'tool-projection-failed',
            message: 'A durable tool lifecycle fact could not be projected to the renderer.',
            payload: {
              ...diagnostics,
              projectionFailureOnly: true,
            },
          })).catch(() => {})
        }
        catch {
          // Diagnostics must never re-enter Turn OS settlement.
        }
      },
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
          await input.life.admit({ cardId: runtime.cardId, turnId: runtime.turnId, conversationId, messages: normalizedPayload.messages }, runtime.abortSignal)
          const preparationDeadline = armAlicizationMainChatPreparationDeadline({
            parentSignal: runtime.abortSignal,
            timeoutMs: input.preparationTimeoutMs ?? mainChatPreparationTimeoutMs,
            onTimeout: () => {
              void input.appendRuntimeDebugLine('chat-stream.preparation-timeout-fired', {
                cardId: input.payload.cardId,
                turnId: input.payload.turnId,
                timeoutMs: input.preparationTimeoutMs ?? mainChatPreparationTimeoutMs,
              })
            },
          })
          let nextPrepared: AlicizationPreparedMainChatExecutionResult
          try {
            nextPrepared = await raceAlicizationMainChatPreparation({
              preparationPromise: input.prepareTurn({
                abortSignal: preparationDeadline.signal,
              }),
              signal: preparationDeadline.signal,
            })
          }
          finally {
            preparationDeadline.clear()
          }
          if (!input.isRunActive())
            throw new DOMException('Alicization chat run is no longer active', 'AbortError')

          prepared = nextPrepared
          input.runStateController.setSessionTraceGetter(input.key, nextPrepared.getSessionTrace)
          currentVisibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
            prepared: nextPrepared,
          })
          streamMetaEmitter = createAlicizationChatStreamMetaEmitter({
            userText: readLifeInputText(normalizedPayload.messages.filter(message => message.role === 'user').at(-1) as Record<string, unknown> | undefined ?? null).text,
            getInteractionIntent: () => prepared?.runtimeSurface?.interactionIntent ?? null,
            cardId: normalizedPayload.cardId,
            turnId: normalizedPayload.turnId,
            getGovernance: () => prepared?.governance ?? null,
            getThought: () => null,
            getVisibleReplyExecution: () => currentVisibleReplyExecution,
            getDigitalLifeSpine: () => projectAlicizationDigitalLifeSpineDigest(prepared?.runtimeSurface?.digitalLifeSpine ?? null),
            getRuntimeDigest: () => buildPreparedRuntimeDigestFallback(prepared),
            getResidentPerformance: () => null,
            getPerformanceManifest: () => prepared?.performanceManifest ?? null,
            getExplicitPerformance: () => currentProviderPerformance,
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
    if (result.settlementError) {
      recordMemorySideFailure(prepared, {
        stage: 'memory-turn-settlement',
        errorSummary: result.settlementError,
      })
    }

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

    finishRunOnce({
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
      acceptedProviderReply: validateAlicizationProviderSettlementPayload({ fullText: finalReply.fullText, prepared: completedPrepared, allowPlainTextProviderReply: true }).payload,
      conversationCommitted: Boolean(input.deliverCommittedReply),
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
