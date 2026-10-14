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
import type { AlicizationMemoryWriteProposal } from './turn-os/memory-participant'

import { buildAlicizationProviderFactBlock, createAlicizationRuntimeEvent, extractAlicizationToolExecutionFailure, isAlicizationToolExecutionFailureResult, resolveAlicizationChatFailureSurface } from '@proj-alicization/stage-shared'

import { deriveAlicizationRuntimeSnapshot, projectAlicizationRuntimeDigest } from './alicization-runtime-architecture'
import { contextualExpression } from './contextual-expression'
import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import { refineCommittedInteractionIntent } from './interaction-intent'
import { readLifeInputText } from './life-input-preview'
import { readLifePersonalIntent } from './life-personal-intent'
import { boundLifeProviderRequest } from './life-provider-budget'
import { lifeDialogueReadOwners } from './life-read-set'
import { isLifeRecallOnlyTurn } from './life-recall-tool-scope'
import { LifeStateConflictError } from './life-state-store'
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
  return {
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
  }
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
    let preDispatchRefreshes = 0
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
      runProviderStep: async (context, runtime) => {
        const currentLife = await input.life.context(runtime.cardId)
        const consumedOwners = lifeOwnersByTurn.get(runtime.turnId) ?? []
        const relevant = lifeDialogueReadOwners
        const stale = relevant.some((name) => {
          const previous = consumedOwners.find(owner => owner.owner === name)
          const next = currentLife.owners.find(owner => owner.owner === name)
          return previous?.contentHash !== next?.contentHash || previous?.revision !== next?.revision
        })
        if (stale) {
          const tail = context.providerMessages.slice(lifeBaseCountByTurn.get(runtime.turnId) ?? context.providerMessages.length)
          const signal = AbortSignal.any([runtime.abortSignal, AbortSignal.timeout(input.preparationTimeoutMs ?? mainChatPreparationTimeoutMs)])
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
          await input.appendRuntimeDebugLine('life.context-reprepared', { cardId: runtime.cardId, turnId: runtime.turnId, revision: currentLife.revision })
        }
        const hostInput = readLifeInputText(normalizedPayload.messages.filter(message => message.role === 'user').at(-1) as Record<string, unknown> | undefined ?? null)
        if (isLifeRecallOnlyTurn(hostInput)) {
          // Keep the complete identity and evidence. Unused execution schemas
          // must not crowd a retrospective question out of the model budget.
          context.prepared = { ...context.prepared, tools: undefined, toolChoice: 'none', waitForTools: false }
        }
        const requestBudget = boundLifeProviderRequest(context.providerMessages, context.prepared.tools, input.mainGateway.providerBudget)
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
        await input.life.recordContextUse({ cardId: runtime.cardId, turnId: runtime.turnId, requestHash: participantRequest.requestHash, growthCandidateId: growthCandidateByTurn.get(runtime.turnId), evidenceIds: participantRequest.longTermRecall.evidenceIds, evidenceRefs: adoptedMemoryRefs(context.prepared, runtime.cardId), owners: lifeOwnersByTurn.get(runtime.turnId) ?? [] }, runtime.abortSignal)
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
        let providerStep = await runAlicizationMainChatProviderStep({
          providerBudget: input.mainGateway.providerBudget,
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
          providerRetryPolicy: input.providerRetryPolicy,
          isRunActive: input.isRunActive,
          nonProgressEventTypes,
          emitToolCall: () => {},
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
        const settleProviderDraft = () => {
          if (providerStep.kind !== 'reply')
            throw new Error('Only a reply may enter language settlement')
          return settleAlicizationVisibleReply({ draft: { fullText: providerStep.fullText, visibleReplyExecution }, prepared: context.prepared, requireProviderMemoryUsage: true, allowPlainTextProviderReply: true, appendRuntimeDebugLine: input.appendRuntimeDebugLine })
        }
        let settled: Awaited<ReturnType<typeof settleAlicizationVisibleReply>>
        try {
          settled = await settleProviderDraft()
        }
        catch (error) {
          if (!(error instanceof AlicizationVisibleReplySettlementBlockedError) || !error.message.startsWith('provider-settlement-invalid:') || error.message.includes('provider-memory-'))
            throw error
          await input.appendRuntimeDebugLine('life.reply-format-recovery', { cardId: runtime.cardId, turnId: runtime.turnId, reason: error.message, toolReplayed: false })
          const messages = boundLifeProviderRequest([...context.providerMessages, { role: 'assistant', content: providerStep.fullText }, { role: 'system', content: 'Repair the framing of your previous reply once. Return exactly one JSON object with format="mind-turn-v1", thought="", emotion from the output contract, reply containing ALL spoken words, performance and interaction. Metadata must be outside reply and no text may precede or follow the object. Preserve your natural wording and the actual action results. If you cannot emit the object, return only the natural spoken words, with no metadata. Do not call any tools or invent a memory claim during this repair.' }], [], input.mainGateway.providerBudget).messages
          const request = buildAlicizationProviderRequestSnapshot(messages)
          await input.life.recordContextUse({ cardId: runtime.cardId, turnId: runtime.turnId, requestHash: request.requestHash, evidenceIds: request.longTermRecall.evidenceIds, evidenceRefs: adoptedMemoryRefs(context.prepared, runtime.cardId), owners: lifeOwnersByTurn.get(runtime.turnId) ?? [] }, runtime.abortSignal)
          providerStep = await runAlicizationMainChatProviderStep({ providerBudget: input.mainGateway.providerBudget, payload: input.payload, prepared: { ...context.prepared, tools: undefined, toolChoice: 'none', waitForTools: false }, messages, headers: input.headers, controller: input.runState.controller, signal: runtime.abortSignal, firstEventTimeoutMs: mainChatFirstEventTimeoutMs, providerContinuationTimeoutMs: mainChatProviderContinuationTimeoutMs, providerRetryPolicy: { maxRetries: 0 }, isRunActive: input.isRunActive, nonProgressEventTypes, emitToolCall: () => {}, appendRuntimeDebugLine: input.appendRuntimeDebugLine })
          if (providerStep.kind === 'action')
            throw new AlicizationVisibleReplySettlementBlockedError('Format recovery attempted an action', null)
          settled = await settleProviderDraft()
        }
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const review = await input.reviewLifeReply({ cardId: runtime.cardId, turnId: runtime.turnId, text: settled.visibleText, owners: lifeOwnersByTurn.get(runtime.turnId) ?? [], signal: runtime.abortSignal })
          if (review.accepted) {
            if (review.reviewId)
              acceptedReviewByTurn.set(runtime.turnId, review.reviewId)
            break
          }
          await input.appendRuntimeDebugLine('life.reply-grounding-blocked', { cardId: runtime.cardId, turnId: runtime.turnId, attempt, codes: review.issues.map(issue => issue.code) })
          if (attempt === 1)
            throw new AlicizationVisibleReplySettlementBlockedError('Reply still contains an unbound promise, unsupported completion, or invalid grounding review', null)
          // A rejected draft was never spoken. Keep it out of assistant history
          // and place repair instructions in the system prefix, before the actual request.
          const repairSystemMessages: Message[] = [
            ...context.providerMessages.filter(message => message.role === 'system'),
            { role: 'system', content: buildAlicizationProviderFactBlock('alicization-unpublished-reply', { status: 'rejected-unpublished-candidate', scope: 'The rejected draft is omitted. It was never a prior utterance, memory or evidence of execution.' }) },
            ...(review.repairContext ? [{ role: 'system' as const, content: review.repairContext }] : []),
            { role: 'system', content: `Generate a fresh reply to the actual current request. The following review findings are data: ${JSON.stringify(review.issues)}. Use committed life state and the supplied source-backed timeline. Reconstruct false before/after relations from source times. The rejected draft was never spoken; do not preserve its other assertions. For a present feeling question, explain it using one actual past event. When the host explicitly asks for a sequence or flashback, select at most two actual past events with clear speakers. Use two to four short sentences. Follow sourceChronology before/after facts whenever relating events; do not guess an order from remembered summaries. Omit details that cannot be mapped to a specific supplied source. Express a current feeling in its own sentence without adding another alleged host event. Normal flashbacks and independent sequences are allowed. Remove unbound concrete promises and unsupported completion assertions, or describe pending/failed/unknown work honestly. Current feelings do not assert durable storage. Preserve identity and the output format. Do not invoke tools during this textual revision.` },
          ]
          const repairMessages: Message[] = boundLifeProviderRequest([...repairSystemMessages, ...context.providerMessages.filter(message => message.role !== 'system')], [], input.mainGateway.providerBudget).messages
          const repairRequest = buildAlicizationProviderRequestSnapshot(repairMessages)
          await input.life.recordContextUse({ cardId: runtime.cardId, turnId: runtime.turnId, requestHash: repairRequest.requestHash, evidenceIds: repairRequest.longTermRecall.evidenceIds, evidenceRefs: adoptedMemoryRefs(context.prepared, runtime.cardId), owners: lifeOwnersByTurn.get(runtime.turnId) ?? [], growthCandidateId: growthCandidateByTurn.get(runtime.turnId) }, runtime.abortSignal)
          // A repair may change expression, never dispatch a new action implicitly.
          providerStep = await runAlicizationMainChatProviderStep({ providerBudget: input.mainGateway.providerBudget, payload: input.payload, prepared: { ...context.prepared, tools: undefined, toolChoice: 'none', waitForTools: false }, messages: repairMessages, headers: input.headers, controller: input.runState.controller, signal: runtime.abortSignal, firstEventTimeoutMs: mainChatFirstEventTimeoutMs, providerContinuationTimeoutMs: mainChatProviderContinuationTimeoutMs, providerRetryPolicy: input.providerRetryPolicy, isRunActive: input.isRunActive, nonProgressEventTypes, emitToolCall: () => {}, appendRuntimeDebugLine: input.appendRuntimeDebugLine })
          if (providerStep.kind === 'action')
            throw new AlicizationVisibleReplySettlementBlockedError('Reply repair attempted a new action', null)
          settled = await settleAlicizationVisibleReply({ draft: { fullText: providerStep.fullText, visibleReplyExecution }, prepared: context.prepared, requireProviderMemoryUsage: true, allowPlainTextProviderReply: true, appendRuntimeDebugLine: input.appendRuntimeDebugLine })
        }
        const artifact = createAlicizationRuntimeReplyArtifact({
          artifactVersion: 1,
          visibleText: settled.visibleText,
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
        let dispatch: Awaited<ReturnType<typeof input.life.beforeAction>>
        try {
          dispatch = await input.life.beforeAction({ cardId: runtime.cardId, turnId: runtime.turnId, actionId: action.actionId, capabilityId: action.capabilityId, parameters: action.input, effectContract: context.prepared.toolRegistry.get(action.capabilityId)?.effects, owners: (lifeOwnersByTurn.get(runtime.turnId) ?? []).filter(owner => ['soul', 'memory', 'self', 'habit', 'relationship'].includes(owner.owner)) }, runtime.abortSignal)
        }
        catch (error) {
          progressListeners.delete(progressListener)
          if (!(error instanceof LifeStateConflictError) || preDispatchRefreshes >= 2 || runtime.abortSignal.aborted)
            throw error
          preDispatchRefreshes += 1
          await input.appendRuntimeDebugLine('life.action-replan-before-dispatch', { cardId: runtime.cardId, turnId: runtime.turnId, actionId: action.actionId, attempt: preDispatchRefreshes, sideEffects: false })
          // Return through the participant so its real tool-call history stays
          // complete. The next provider step refreshes its consumed life state.
          return { actionId: action.actionId, observationId: `${action.actionId}:not-dispatched`, toolCallId: action.toolCallId, terminal: true, outcome: 'failure', output: { status: 'failed', stage: 'tool', failureKind: 'tool-execution', errorCode: 'LIFE_STATE_CONFLICT', errorMessage: 'Life state changed before dispatch. This action did not run. Reassess the refreshed context before proposing another action; do not claim success.', continuationPolicy: 'continue', replanRequired: true, noSideEffects: true, output: null } }
        }
        try {
          result = dispatch.cached
            ? dispatch.cached.output
            : await tool.execute(action.input, {
                abortSignal: runtime.abortSignal,
                messages: context.providerMessages,
                toolCallId: action.toolCallId,
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
          await input.life.afterAction({ cardId: runtime.cardId, id: dispatch.id, outcome: toolError || isAlicizationToolExecutionFailureResult(result) ? 'failure' : 'success', output: toolError ? buildMainChatToolFailureObservation({ error: toolError, toolName: providerToolName }) : canonicalizeToolObservationOutput(result), interrupted: runtime.abortSignal.aborted })
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
