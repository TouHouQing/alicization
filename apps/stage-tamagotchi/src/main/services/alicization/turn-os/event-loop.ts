import type {
  AlicizationActionObservationLink,
  AlicizationRuntimeEventEnvelope,
  AlicizationRuntimeEventSource,
  AlicizationRuntimeEventType,
  AlicizationRuntimeToolProgressSignal,
  AlicizationRuntimeToolProjectionPhase,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationRuntimeCheckpoint,
  AlicizationRuntimeDeliveryOwner,
} from './checkpoint-store'
import type { AlicizationRuntimeEventScope } from './event-store'
import type {
  AlicizationRuntimeReplyArtifact,
} from './reply-artifact'
import type {
  AlicizationTurnRuntimeState,
} from './runtime-state'

import { isDeepStrictEqual } from 'node:util'

import {
  createAlicizationRuntimeEvent,
  parseAlicizationActionObservation,
} from '@proj-alicization/stage-shared'

import {
  createAlicizationRuntimeReplyDeliveryIntent,
  parseAlicizationRuntimeReplyArtifact,
} from './reply-artifact'
import { resolveAlicizationRuntimeTimeoutReason } from './runtime-errors'
import {
  createAlicizationTurnRuntimeState,
  listAlicizationActiveActionIds,
  reduceAlicizationRuntimeEvent,
  toAlicizationRuntimeCheckpoint,
} from './runtime-state'

export interface AlicizationModelAction {
  actionId: string
  toolCallId: string | null
  capabilityId: string
  providerToolName: string
  input: unknown
}

export interface AlicizationModelObservation extends AlicizationActionObservationLink {
  output?: unknown
}

export interface AlicizationActionProgress {
  actionId: string
  toolCallId: string
  capabilityId: string
  providerToolName: string
  selectedChannel?: string | null
  signal?: AlicizationRuntimeToolProgressSignal
  phase: AlicizationRuntimeToolProjectionPhase
  elapsedMs: number
  timeoutMs?: number
  errorCode?: string
  errorMessage?: string
  occurredAt?: number
  eventId?: string
  threadId?: string
  adapterEventType?: string
  itemType?: string
  summary?: string
  command?: string
  commandStatus?: string
  commandExitCode?: number
  outputPreview?: string
}

export interface AlicizationModelTextReply {
  artifact: AlicizationRuntimeReplyArtifact
}

export type AlicizationModelStep
  = | {
    kind: 'action'
    action: AlicizationModelAction
  }
  | {
    kind: 'reply'
    reply: AlicizationModelTextReply
  }

export type AlicizationMemoryRuntimeEventType = Extract<
  AlicizationRuntimeEventType,
  | 'working_memory.snapshot.created'
  | 'working_memory.updated'
  | 'working_memory.compression.started'
  | 'working_memory.compression.completed'
  | 'long_term_memory.recall.started'
  | 'long_term_memory.recall.evidence'
  | 'long_term_memory.recall.abstained'
  | 'long_term_memory.recall.completed'
  | 'memory.write.proposed'
  | 'memory.write.accepted'
  | 'memory.write.rejected'
  | 'memory.owner.settled'
  | 'memory.tombstoned'
>

export interface AlicizationEventLoopRuntimeView extends AlicizationTurnRuntimeState {
  abortSignal: AbortSignal
  appendActionProgress: (
    progress: AlicizationActionProgress,
  ) => Promise<void>
  appendMemoryEvent: (
    eventType: AlicizationMemoryRuntimeEventType,
    payload: unknown,
    idempotencyKey?: string | null,
  ) => Promise<void>
}

export interface AlicizationEventLoopParticipant<TTurnInput = unknown, TModelContext = unknown> {
  assembleContext: (
    input: TTurnInput,
    runtime: AlicizationEventLoopRuntimeView,
  ) => Promise<TModelContext>
  runModelStep: (
    context: TModelContext,
    runtime: AlicizationEventLoopRuntimeView,
  ) => Promise<AlicizationModelStep>
  executeAction: (
    action: AlicizationModelAction,
    runtime: AlicizationEventLoopRuntimeView,
  ) => Promise<AlicizationModelObservation>
  settleReply: (
    reply: AlicizationModelTextReply,
    runtime: AlicizationEventLoopRuntimeView,
  ) => Promise<void>
  onTurnSettled?: (input: {
    status: AlicizationEventLoopResult['status']
    error: string | null
    runtime: AlicizationEventLoopRuntimeView
  }) => Promise<void>
}

export interface AlicizationEventLoopPersistence {
  appendRuntimeEvent: (
    scope: AlicizationRuntimeEventScope,
    event: AlicizationRuntimeEventEnvelope,
  ) => Promise<AlicizationRuntimeEventEnvelope>
  saveRuntimeCheckpoint: (
    checkpoint: AlicizationRuntimeCheckpoint,
  ) => Promise<AlicizationRuntimeCheckpoint>
}

export interface AlicizationEventLoopLateEvent {
  eventType: 'action.progress' | AlicizationMemoryRuntimeEventType
  source: 'tool' | 'memory'
  scope: AlicizationRuntimeEventScope
  payload: unknown
  idempotencyKey: string | null
  terminalEventType: AlicizationRuntimeEventType | null
}

export interface AlicizationEventLoopResult {
  status: 'completed' | 'failed' | 'cancelled' | 'timed-out'
  state: AlicizationTurnRuntimeState
  error: string | null
  cause: unknown | null
  replyArtifact: AlicizationRuntimeReplyArtifact | null
  settlementError: string | null
  settlementCause: unknown | null
}

interface LiveTurn {
  scope: AlicizationRuntimeEventScope
  controller: AbortController
  terminalEventType: AlicizationRuntimeEventType | null
  terminalAuthority: 'open' | AlicizationEventLoopResult['status']
  terminalObservationDurability: {
    promise: Promise<{ error: unknown | null }>
    resolve: (result: { error: unknown | null }) => void
  } | null
  modelStepStartDurability: {
    promise: Promise<{ error: unknown | null }>
    resolve: (result: { error: unknown | null }) => void
  } | null
  replyDeliverySettlement: {
    promise: Promise<{ delivered: boolean }>
    resolve: (result: { delivered: boolean }) => void
  } | null
  deferredCancellation: { reason: unknown } | null
  cancellationDurability: Promise<{ error: unknown | null }>
  resolveCancellationDurability: (result: { error: unknown | null }) => void
  cancellationDurabilitySettled: boolean
  participantSettlementActive: boolean
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'unknown error')
}

function errorCode(error: unknown) {
  if (!error || typeof error !== 'object')
    return ''
  const record = error as Record<string, unknown>
  return String(record.errorCode ?? record.code ?? '').trim().toUpperCase()
}

function isToolCancellation(error: unknown) {
  if (!error || typeof error !== 'object')
    return false
  const record = error as Record<string, unknown>
  return String(record.status ?? '').trim().toLowerCase() === 'cancelled'
    || String(record.finalStatus ?? '').trim().toLowerCase() === 'cancelled'
    || String(record.reasonCode ?? '').trim().toUpperCase() === 'EXPLICIT_CANCELLATION'
    || errorCode(error) === 'TOOL_EXECUTION_CANCELLED'
}

function isToolTimeout(error: unknown) {
  if (!error || typeof error !== 'object')
    return false
  const record = error as Record<string, unknown>
  return String(record.status ?? '').trim().toLowerCase() === 'timeout'
    || String(record.finalStatus ?? '').trim().toLowerCase() === 'timeout'
    || /(?:^|_)TIMEOUT$/u.test(errorCode(error))
}

function toolFailureOutput(
  action: AlicizationModelAction,
  error: unknown,
) {
  const record = error && typeof error === 'object'
    ? error as Record<string, unknown>
    : null
  const cancelled = isToolCancellation(error)
  const timedOut = isToolTimeout(error)
  const finalStatus = String(record?.finalStatus ?? '').trim().toLowerCase()
  const status = finalStatus === 'dead-lettered'
    ? 'dead-lettered'
    : timedOut
      ? 'timeout'
      : cancelled
        ? 'cancelled'
        : 'failed'
  const message = errorMessage(error)
  return {
    status,
    stage: 'tool',
    failureKind: 'tool-execution',
    toolName: String(record?.toolName ?? action.providerToolName),
    errorCode: errorCode(error) || 'TOOL_EXECUTION_FAILED',
    errorMessage: message,
    summary: `${action.providerToolName} failed: ${message}`,
    continuationPolicy: 'model',
    output: null,
    ...(finalStatus === 'dead-lettered' ? { finalStatus } : {}),
  }
}

function normalizeTerminalToolObservation(
  observation: AlicizationModelObservation,
): AlicizationModelObservation {
  if (
    !observation.terminal
    || !observation.output
    || typeof observation.output !== 'object'
    || Array.isArray(observation.output)
  ) {
    return observation
  }

  const status = isToolTimeout(observation.output)
    ? 'timeout'
    : isToolCancellation(observation.output)
      ? 'cancelled'
      : null
  if (!status)
    return observation

  return {
    ...observation,
    outcome: status === 'cancelled' ? 'cancelled' : 'failure',
    output: {
      ...observation.output,
      status,
    },
  }
}

function abortError(reason?: unknown) {
  if (
    reason
    && typeof reason === 'object'
    && (
      String((reason as Record<string, unknown>).name ?? '').trim().toLowerCase() === 'aborterror'
      || resolveAlicizationRuntimeTimeoutReason(reason)
    )
  ) {
    return reason as Error
  }

  const error = new Error(
    typeof reason === 'string' && reason.trim()
      ? reason.trim()
      : 'runtime turn was cancelled',
  )
  error.name = 'AbortError'
  return error
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted)
    throw abortError(signal.reason)
}

function raceWithAbort<T>(operation: () => Promise<T>, signal: AbortSignal) {
  if (signal.aborted)
    return Promise.reject<T>(abortError(signal.reason))

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal.reason))
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      signal.removeEventListener('abort', onAbort)
      reject(abortError(signal.reason))
      return
    }

    let promise: Promise<T>
    try {
      promise = operation()
    }
    catch (error) {
      signal.removeEventListener('abort', onAbort)
      reject(error)
      return
    }
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort)
    })
  })
}

function assertSameScope(
  expected: AlicizationRuntimeEventScope,
  actual: AlicizationRuntimeEventScope,
) {
  if (
    expected.turnId !== actual.turnId
    || expected.cardId !== actual.cardId
    || expected.userId !== actual.userId
    || expected.conversationId !== actual.conversationId
  ) {
    throw new Error('live runtime turn scope does not match the cancellation scope')
  }
}

function parseRequiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${label} must not be empty`)
  return value.trim()
}

function parseModelAction(input: AlicizationModelAction): AlicizationModelAction {
  return {
    actionId: parseRequiredText(input.actionId, 'model actionId'),
    toolCallId: input.toolCallId == null
      ? null
      : parseRequiredText(input.toolCallId, 'model toolCallId'),
    capabilityId: parseRequiredText(input.capabilityId, 'model capabilityId'),
    providerToolName: parseRequiredText(input.providerToolName, 'model providerToolName'),
    input: input.input,
  }
}

function parseTextReply(input: AlicizationModelTextReply): AlicizationModelTextReply {
  return {
    artifact: parseAlicizationRuntimeReplyArtifact(input.artifact),
  }
}

function runtimeView(
  state: AlicizationTurnRuntimeState,
  abortSignal: AbortSignal,
  appendActionProgress: (
    progress: AlicizationActionProgress,
  ) => Promise<void>,
  appendMemoryEvent: (
    eventType: AlicizationMemoryRuntimeEventType,
    payload: unknown,
    idempotencyKey?: string | null,
  ) => Promise<void>,
): AlicizationEventLoopRuntimeView {
  return {
    ...state,
    actions: Object.fromEntries(
      Object.entries(state.actions).map(([actionId, action]) => [
        actionId,
        {
          ...action,
          lastObservation: action.lastObservation
            ? structuredClone(action.lastObservation)
            : null,
        },
      ]),
    ),
    pendingActionSettlements: Object.fromEntries(
      Object.entries(state.pendingActionSettlements)
        .map(([settlementId, settlement]) => [
          settlementId,
          { ...settlement },
        ]),
    ),
    pendingDelivery: state.pendingDelivery
      ? structuredClone(state.pendingDelivery)
      : null,
    committedDelivery: state.committedDelivery
      ? structuredClone(state.committedDelivery)
      : null,
    issues: [...state.issues],
    abortSignal,
    appendActionProgress,
    appendMemoryEvent,
  }
}

function isRepeatedIdempotentPersistenceResult(
  pending: AlicizationRuntimeEventEnvelope,
  persisted: AlicizationRuntimeEventEnvelope,
) {
  return Boolean(pending.idempotencyKey)
    && persisted.idempotencyKey === pending.idempotencyKey
    && persisted.eventType === pending.eventType
    && persisted.schemaVersion === pending.schemaVersion
    && persisted.turnId === pending.turnId
    && persisted.cardId === pending.cardId
    && persisted.userId === pending.userId
    && persisted.conversationId === pending.conversationId
    && persisted.source === pending.source
    && persisted.causationId === pending.causationId
    && persisted.correlationId === pending.correlationId
    && isDeepStrictEqual(persisted.payload, pending.payload)
}

function actionTerminalEventType(
  outcome: AlicizationActionObservationLink['outcome'],
  output?: unknown,
): AlicizationRuntimeEventType {
  if (outcome === 'success')
    return 'action.completed'
  if (
    outcome === 'failure'
    && output
    && typeof output === 'object'
    && !Array.isArray(output)
    && String((output as Record<string, unknown>).status ?? '').trim().toLowerCase() === 'dead-lettered'
  ) {
    return 'action.dead_lettered'
  }
  if (outcome === 'failure')
    return 'action.failed'
  if (outcome === 'cancelled')
    return 'action.cancelled'
  return 'action.rejected'
}

function claimTerminalAuthority(
  liveTurn: LiveTurn,
  authority: Exclude<LiveTurn['terminalAuthority'], 'open'>,
) {
  if (liveTurn.terminalAuthority !== 'open')
    return false
  liveTurn.terminalAuthority = authority
  return true
}

function claimDeferredCancellation(
  liveTurn: LiveTurn,
  reason: unknown,
) {
  if (liveTurn.deferredCancellation)
    return false
  liveTurn.deferredCancellation = { reason }
  return true
}

function takeDeferredCancellation(liveTurn: LiveTurn) {
  const deferredCancellation = liveTurn.deferredCancellation
  liveTurn.deferredCancellation = null
  return deferredCancellation
}

function resolveTerminalCancellationStatus(
  reason: unknown,
): Extract<AlicizationEventLoopResult['status'], 'cancelled' | 'timed-out'> {
  return resolveAlicizationRuntimeTimeoutReason(reason)
    ? 'timed-out'
    : 'cancelled'
}

function settleCancellationDurability(
  liveTurn: LiveTurn,
  error: unknown | null,
) {
  if (liveTurn.cancellationDurabilitySettled)
    return
  liveTurn.cancellationDurabilitySettled = true
  liveTurn.resolveCancellationDurability({ error })
}

export function createAlicizationEventLoop<TTurnInput = unknown, TModelContext = unknown>(options: {
  persistence: AlicizationEventLoopPersistence
  participant: AlicizationEventLoopParticipant<TTurnInput, TModelContext>
  onPersistedEvent?: (
    event: AlicizationRuntimeEventEnvelope,
  ) => Promise<void> | void
  onPersistedEventFailure?: (input: {
    event: AlicizationRuntimeEventEnvelope
    error: unknown
  }) => Promise<void> | void
  onLateEvent?: (input: AlicizationEventLoopLateEvent) => Promise<void> | void
  now?: () => number
  createEventId?: () => string
  maxSteps?: number
}) {
  const now = options.now ?? (() => Date.now())
  const createEventId = options.createEventId ?? (() => globalThis.crypto.randomUUID())
  const maxSteps = options.maxSteps ?? 8
  const liveTurns = new Map<string, LiveTurn>()

  if (!Number.isInteger(maxSteps) || maxSteps <= 0)
    throw new TypeError('event loop maxSteps must be a positive integer')

  async function runTurn(input: {
    scope: AlicizationRuntimeEventScope
    deliveryOwner: AlicizationRuntimeDeliveryOwner
    turnInput: TTurnInput
    signal?: AbortSignal
  }): Promise<AlicizationEventLoopResult> {
    if (liveTurns.has(input.scope.turnId))
      throw new Error(`runtime turn ${input.scope.turnId} is already active`)

    const controller = new AbortController()
    let resolveCancellationDurability!: LiveTurn['resolveCancellationDurability']
    const cancellationDurability = new Promise<{ error: unknown | null }>((resolve) => {
      resolveCancellationDurability = resolve
    })
    const liveTurn: LiveTurn = {
      scope: { ...input.scope },
      controller,
      terminalEventType: null,
      terminalAuthority: 'open',
      terminalObservationDurability: null,
      modelStepStartDurability: null,
      replyDeliverySettlement: null,
      deferredCancellation: null,
      cancellationDurability,
      resolveCancellationDurability,
      cancellationDurabilitySettled: false,
      participantSettlementActive: false,
    }
    liveTurns.set(input.scope.turnId, liveTurn)

    const onExternalAbort = () => {
      const timeoutReason = resolveAlicizationRuntimeTimeoutReason(input.signal?.reason)
      if (timeoutReason) {
        // A user cancellation requested earlier may be waiting for the current
        // persistence barrier. Do not let a later watchdog signal steal the
        // already-queued terminal authority.
        if (liveTurn.deferredCancellation)
          return
        if (
          liveTurn.terminalObservationDurability
          || liveTurn.modelStepStartDurability
          || liveTurn.replyDeliverySettlement
        ) {
          claimDeferredCancellation(liveTurn, input.signal?.reason)
          return
        }
        if (claimTerminalAuthority(liveTurn, 'timed-out'))
          controller.abort(input.signal?.reason)
        return
      }
      if (
        liveTurn.terminalObservationDurability
        || liveTurn.modelStepStartDurability
        || liveTurn.replyDeliverySettlement
      ) {
        claimDeferredCancellation(liveTurn, input.signal?.reason)
        return
      }
      if (claimTerminalAuthority(liveTurn, 'cancelled'))
        controller.abort(input.signal?.reason)
    }
    if (input.signal?.aborted) {
      const timeoutReason = resolveAlicizationRuntimeTimeoutReason(input.signal.reason)
      claimTerminalAuthority(liveTurn, timeoutReason ? 'timed-out' : 'cancelled')
      controller.abort(input.signal.reason)
    }
    else {
      input.signal?.addEventListener('abort', onExternalAbort, { once: true })
    }

    let state = createAlicizationTurnRuntimeState(input.scope, input.deliveryOwner)
    let failureSurface: 'context' | 'provider' | 'tool' | 'delivery' = 'context'
    let currentActionId: string | null = null
    const providerFailure = {
      origin: 'none' as 'none' | 'invocation-or-validation',
    }
    const toolFailure = {
      origin: 'none' as 'none' | 'adapter-or-validation',
    }

    const appendPersistedEvent = async (
      eventType: AlicizationRuntimeEventType,
      payload: unknown,
      source: AlicizationRuntimeEventSource = 'runtime',
      idempotencyKey: string | null = null,
    ) => {
      const pendingEvent = createAlicizationRuntimeEvent({
        eventId: createEventId(),
        eventType,
        sequence: 0,
        ...input.scope,
        source,
        idempotencyKey,
        occurredAt: now(),
        payload,
      })
      const persistedEvent = await options.persistence.appendRuntimeEvent(input.scope, pendingEvent)
      if (persistedEvent.sequence <= state.sequence) {
        if (isRepeatedIdempotentPersistenceResult(pendingEvent, persistedEvent))
          return persistedEvent
        throw new Error(
          `runtime persistence returned already-applied non-idempotent event sequence ${persistedEvent.sequence}`,
        )
      }
      state = reduceAlicizationRuntimeEvent(state, persistedEvent)
      liveTurn.terminalEventType = state.terminalEventType
      return persistedEvent
    }

    const append = async (
      eventType: AlicizationRuntimeEventType,
      payload: unknown,
      source: AlicizationRuntimeEventSource = 'runtime',
      idempotencyKey: string | null = null,
    ) => {
      const persistedEvent = await appendPersistedEvent(
        eventType,
        payload,
        source,
        idempotencyKey,
      )
      await options.persistence.saveRuntimeCheckpoint(
        toAlicizationRuntimeCheckpoint(state, now()),
      )
      try {
        await options.onPersistedEvent?.(persistedEvent)
      }
      catch (error) {
        try {
          await options.onPersistedEventFailure?.({
            event: persistedEvent,
            error,
          })
        }
        catch {
          // Sidecar diagnostics cannot re-enter Turn OS settlement.
        }
      }
      return persistedEvent
    }

    const appendActionProgress = async (progress: AlicizationActionProgress) => {
      const actionId = parseRequiredText(progress.actionId, 'action progress actionId')
      const toolCallId = parseRequiredText(progress.toolCallId, 'action progress toolCallId')
      const action = state.actions[actionId]
      if (!action)
        throw new Error(`action progress ${actionId} references an unknown action`)
      if (action.toolCallId !== toolCallId)
        throw new Error(`action progress ${actionId} toolCallId does not match its action`)
      const payload = {
        ...progress,
        actionId,
        toolCallId,
      }
      const idempotencyKey = progress.eventId
        ? `${actionId}:progress:${progress.eventId}`
        : null
      if (liveTurn.terminalAuthority !== 'open' || liveTurn.terminalEventType) {
        try {
          await options.onLateEvent?.({
            eventType: 'action.progress',
            source: 'tool',
            scope: { ...input.scope },
            payload,
            idempotencyKey,
            terminalEventType: liveTurn.terminalEventType,
          })
        }
        catch {
          // Late-event diagnostics must never re-enter Turn OS settlement.
        }
        return
      }
      await append(
        'action.progress',
        payload,
        'tool',
        idempotencyKey,
      )
    }

    const appendMemoryEvent = async (
      eventType: AlicizationMemoryRuntimeEventType,
      payload: unknown,
      idempotencyKey: string | null = null,
    ) => {
      if (liveTurn.terminalAuthority !== 'open' || liveTurn.terminalEventType) {
        try {
          await options.onLateEvent?.({
            eventType,
            source: 'memory',
            scope: { ...input.scope },
            payload,
            idempotencyKey,
            terminalEventType: liveTurn.terminalEventType,
          })
        }
        catch {
          // Late-event diagnostics must never re-enter Turn OS settlement.
        }
        return
      }
      await append(eventType, payload, 'memory', idempotencyKey)
    }

    const appendMemorySettlementEvent = async (
      eventType: AlicizationMemoryRuntimeEventType,
      payload: unknown,
      idempotencyKey: string | null = null,
    ) => {
      if (!liveTurn.participantSettlementActive) {
        await appendMemoryEvent(eventType, payload, idempotencyKey)
        return
      }
      await append(eventType, payload, 'memory', idempotencyKey)
    }

    const currentRuntimeView = () => runtimeView(
      state,
      controller.signal,
      appendActionProgress,
      appendMemoryEvent,
    )

    const notifyParticipantSettled = async (
      status: AlicizationEventLoopResult['status'],
      error: string | null,
    ) => {
      liveTurn.participantSettlementActive = true
      try {
        await options.participant.onTurnSettled?.({
          status,
          error,
          runtime: runtimeView(
            state,
            controller.signal,
            appendActionProgress,
            appendMemorySettlementEvent,
          ),
        })
        return {
          settlementError: null,
          settlementCause: null,
        }
      }
      catch (settlementCause) {
        return {
          settlementError: errorMessage(settlementCause),
          settlementCause,
        }
      }
      finally {
        liveTurn.participantSettlementActive = false
      }
    }

    const settleParticipant = async (
      result: Omit<
        AlicizationEventLoopResult,
        'settlementError' | 'settlementCause'
      >,
    ): Promise<AlicizationEventLoopResult> => ({
      ...result,
      ...await notifyParticipantSettled(result.status, result.error),
    })

    const appendTerminalActionObservation = async (input: {
      actionId: string
      toolCallId: string | null
      outcome: AlicizationActionObservationLink['outcome']
      error?: string
    }) => {
      const observationId = `${input.actionId}:observation:${createEventId()}`
      await append('action.observation', {
        actionId: input.actionId,
        observationId,
        toolCallId: input.toolCallId,
        terminal: true,
        outcome: input.outcome,
        ...(input.error ? { error: input.error } : {}),
      }, 'tool')
      return observationId
    }

    const appendActiveActionFailure = async (reason: unknown) => {
      if (
        !currentActionId
        || state.actions[currentActionId]?.status !== 'active'
      ) {
        return false
      }
      const action = state.actions[currentActionId]!
      const error = errorMessage(reason)
      await appendTerminalActionObservation({
        actionId: currentActionId,
        toolCallId: action.toolCallId,
        outcome: 'failure',
        error,
      })
      await append('action.failed', {
        actionId: currentActionId,
        toolCallId: action.toolCallId,
        error,
      }, 'tool')
      return true
    }

    const cancelActiveTurn = async (reason: unknown): Promise<AlicizationEventLoopResult> => {
      const cancellationStatus = resolveTerminalCancellationStatus(reason)
      if (liveTurn.terminalAuthority === 'open')
        claimTerminalAuthority(liveTurn, cancellationStatus)
      for (const actionId of listAlicizationActiveActionIds(state)) {
        const action = state.actions[actionId]!
        await appendTerminalActionObservation({
          actionId,
          toolCallId: action.toolCallId,
          outcome: 'cancelled',
          error: errorMessage(reason),
        })
        await append('action.cancelled', {
          actionId,
          toolCallId: action.toolCallId,
          reason: errorMessage(reason),
        })
      }
      const terminalEventType = cancellationStatus === 'timed-out'
        ? 'runtime.timed_out'
        : 'runtime.cancelled'
      if (state.terminalEventType !== terminalEventType) {
        await append(terminalEventType, {
          reason: errorMessage(reason),
          ...(cancellationStatus === 'timed-out'
            ? { timeoutReason: resolveAlicizationRuntimeTimeoutReason(reason) }
            : {}),
        }, 'runtime', `${input.scope.turnId}:terminal:${cancellationStatus}`)
      }
      const result = {
        status: cancellationStatus,
        state,
        error: errorMessage(reason),
        cause: reason ?? null,
        replyArtifact: null,
      } satisfies Omit<
        AlicizationEventLoopResult,
        'settlementError' | 'settlementCause'
      >
      return await settleParticipant(result)
    }

    try {
      await append('turn.accepted', {
        deliveryOwner: input.deliveryOwner,
      }, 'user', `${input.scope.turnId}:accepted`)
      throwIfAborted(controller.signal)

      await append('context.assembly.started', {})
      const context = await raceWithAbort(
        () => options.participant.assembleContext(
          input.turnInput,
          currentRuntimeView(),
        ),
        controller.signal,
      )
      throwIfAborted(controller.signal)
      await append('context.assembly.completed', {})

      for (let stepIndex = 1; stepIndex <= maxSteps; stepIndex++) {
        throwIfAborted(controller.signal)
        failureSurface = 'provider'
        providerFailure.origin = 'none'
        let resolveModelStepStartDurability!: (
          result: { error: unknown | null },
        ) => void
        const modelStepStartDurability = {
          promise: new Promise<{ error: unknown | null }>((resolve) => {
            resolveModelStepStartDurability = resolve
          }),
          resolve: (result: { error: unknown | null }) => {
            resolveModelStepStartDurability(result)
          },
        }
        liveTurn.modelStepStartDurability = modelStepStartDurability
        try {
          await append('model.step.started', {
            stepIndex,
          }, 'model')
          modelStepStartDurability.resolve({ error: null })
          const deferredCancellation = takeDeferredCancellation(liveTurn)
          if (
            deferredCancellation
            && claimTerminalAuthority(
              liveTurn,
              resolveTerminalCancellationStatus(deferredCancellation.reason),
            )
          ) {
            controller.abort(deferredCancellation.reason)
          }
        }
        catch (error) {
          liveTurn.deferredCancellation = null
          modelStepStartDurability.resolve({ error })
          throw error
        }
        finally {
          if (liveTurn.modelStepStartDurability === modelStepStartDurability)
            liveTurn.modelStepStartDurability = null
        }
        throwIfAborted(controller.signal)
        let step: AlicizationModelStep
        try {
          const participantStep = await raceWithAbort(
            () => options.participant.runModelStep(
              context,
              currentRuntimeView(),
            ),
            controller.signal,
          )
          throwIfAborted(controller.signal)
          if (participantStep.kind === 'action') {
            const action = parseModelAction(participantStep.action)
            if (state.actions[action.actionId])
              throw new Error(`model action ${action.actionId} already exists in this turn`)
            step = {
              kind: 'action',
              action,
            }
          }
          else if (participantStep.kind === 'reply') {
            step = {
              kind: 'reply',
              reply: parseTextReply(participantStep.reply),
            }
          }
          else {
            throw new TypeError('model step kind must be action or reply')
          }
        }
        catch (error) {
          providerFailure.origin = 'invocation-or-validation'
          throw error
        }

        if (step.kind === 'action') {
          const action = step.action

          currentActionId = action.actionId
          await append('model.tool_call.proposed', {
            actionId: action.actionId,
            toolCallId: action.toolCallId,
            capabilityId: action.capabilityId,
            providerToolName: action.providerToolName,
            arguments: action.input,
          }, 'model')
          await append('model.step.completed', {
            stepIndex,
            outcome: 'action',
          }, 'model')
          await append('action.started', {
            actionId: action.actionId,
            toolCallId: action.toolCallId,
            capabilityId: action.capabilityId,
            providerToolName: action.providerToolName,
          })

          failureSurface = 'tool'
          toolFailure.origin = 'none'
          let observation: AlicizationModelObservation
          let observationLink: AlicizationActionObservationLink
          try {
            observation = await raceWithAbort(
              () => options.participant.executeAction(
                action,
                currentRuntimeView(),
              ),
              controller.signal,
            )
          }
          catch (error) {
            toolFailure.origin = 'adapter-or-validation'
            if (controller.signal.aborted) {
              const timeoutReason = resolveAlicizationRuntimeTimeoutReason(
                controller.signal.reason,
              ) ?? resolveAlicizationRuntimeTimeoutReason(error)
              if (timeoutReason)
                await appendActiveActionFailure(controller.signal.reason ?? error)
              throw error
            }
            observation = {
              actionId: action.actionId,
              observationId: `${action.actionId}:observation:${createEventId()}`,
              toolCallId: action.toolCallId,
              terminal: true,
              outcome: isToolCancellation(error) ? 'cancelled' : 'failure',
              output: toolFailureOutput(action, error),
            }
            toolFailure.origin = 'none'
          }

          try {
            observation = normalizeTerminalToolObservation(observation)
            throwIfAborted(controller.signal)
            observationLink = parseAlicizationActionObservation(observation)
            if (observationLink.actionId !== action.actionId)
              throw new Error('tool observation actionId does not match the active model action')
            if (action.toolCallId && observationLink.toolCallId !== action.toolCallId)
              throw new Error('tool observation toolCallId does not match the active model action')
            if (!observationLink.terminal)
              throw new Error('tool execution returned without a terminal observation')
          }
          catch (error) {
            toolFailure.origin = 'adapter-or-validation'
            throw error
          }

          let resolveTerminalObservationDurability!: (
            result: { error: unknown | null },
          ) => void
          const terminalObservationDurability = {
            promise: new Promise<{ error: unknown | null }>((resolve) => {
              resolveTerminalObservationDurability = resolve
            }),
            resolve: (result: { error: unknown | null }) => {
              resolveTerminalObservationDurability(result)
            },
          }
          let settlementId: string
          do {
            settlementId = `settlement:${createEventId()}`
          } while (state.pendingActionSettlements[settlementId])
          const settlement = {
            settlementId,
            actionId: action.actionId,
            toolCallId: observationLink.toolCallId,
            observationId: observationLink.observationId,
          }
          liveTurn.terminalObservationDurability = terminalObservationDurability
          try {
            await append(
              'action.settlement.started',
              settlement,
              'runtime',
              `${settlementId}:started`,
            )
            await append('action.observation', {
              ...observationLink,
              ...('output' in observation ? { output: observation.output } : {}),
            }, 'tool')
            await append(
              'action.settlement.completed',
              settlement,
              'runtime',
              `${settlementId}:completed`,
            )
            await append(actionTerminalEventType(observationLink.outcome, observation.output), {
              actionId: action.actionId,
              toolCallId: observationLink.toolCallId,
            }, 'tool')
            currentActionId = null
            terminalObservationDurability.resolve({ error: null })
            const deferredCancellation = takeDeferredCancellation(liveTurn)
            if (
              deferredCancellation
              && claimTerminalAuthority(
                liveTurn,
                resolveTerminalCancellationStatus(deferredCancellation.reason),
              )
            ) {
              controller.abort(deferredCancellation.reason)
            }
          }
          catch (error) {
            liveTurn.deferredCancellation = null
            terminalObservationDurability.resolve({ error })
            throw error
          }
          finally {
            if (liveTurn.terminalObservationDurability === terminalObservationDurability)
              liveTurn.terminalObservationDurability = null
          }
          throwIfAborted(controller.signal)
          continue
        }

        const reply = step.reply
        const deliveryIntent = createAlicizationRuntimeReplyDeliveryIntent(
          input.scope,
          input.deliveryOwner,
          reply.artifact,
        )
        await append('model.text.delta', {
          text: reply.artifact.visibleText,
        }, 'model')
        await append('model.step.completed', {
          stepIndex,
          outcome: 'reply',
          ...deliveryIntent,
        }, 'model', `${deliveryIntent.deliveryId}:intent`)
        failureSurface = 'delivery'
        let resolveReplyDeliverySettlement!: (
          result: { delivered: boolean },
        ) => void
        const replyDeliverySettlement = {
          promise: new Promise<{ delivered: boolean }>((resolve) => {
            resolveReplyDeliverySettlement = resolve
          }),
          resolve: (result: { delivered: boolean }) => {
            resolveReplyDeliverySettlement(result)
          },
        }
        liveTurn.replyDeliverySettlement = replyDeliverySettlement
        try {
          await raceWithAbort(
            () => options.participant.settleReply(
              reply,
              currentRuntimeView(),
            ),
            controller.signal,
          )
          throwIfAborted(controller.signal)
          if (!claimTerminalAuthority(liveTurn, 'completed'))
            throw abortError(controller.signal.reason)
          liveTurn.deferredCancellation = null
          replyDeliverySettlement.resolve({ delivered: true })
        }
        catch (error) {
          const deferredCancellation = takeDeferredCancellation(liveTurn)
          if (
            deferredCancellation
            && claimTerminalAuthority(
              liveTurn,
              resolveTerminalCancellationStatus(deferredCancellation.reason),
            )
          ) {
            controller.abort(deferredCancellation.reason)
          }
          replyDeliverySettlement.resolve({ delivered: false })
          throw error
        }
        finally {
          if (liveTurn.replyDeliverySettlement === replyDeliverySettlement)
            liveTurn.replyDeliverySettlement = null
        }
        await append('assistant.reply.committed', {
          replyId: deliveryIntent.replyId,
          deliveryId: deliveryIntent.deliveryId,
          contentHash: deliveryIntent.contentHash,
          artifactHash: deliveryIntent.artifactHash,
        }, 'model', `${deliveryIntent.replyId}:committed`)
        await append(
          'turn.completed',
          {},
          'runtime',
          `${input.scope.turnId}:terminal:completed`,
        )
        const result = {
          status: 'completed',
          state,
          error: null,
          cause: null,
          replyArtifact: state.committedDelivery?.artifact ?? null,
        } satisfies Omit<
          AlicizationEventLoopResult,
          'settlementError' | 'settlementCause'
        >
        return await settleParticipant(result)
      }

      if (!claimTerminalAuthority(liveTurn, 'timed-out'))
        throw abortError(controller.signal.reason)
      try {
        await append('runtime.timed_out', {
          reason: `model step budget exhausted after ${maxSteps} steps`,
        }, 'runtime', `${input.scope.turnId}:terminal:timed-out`)
        settleCancellationDurability(liveTurn, null)
      }
      catch (error) {
        settleCancellationDurability(liveTurn, error)
        throw error
      }
      const result = {
        status: 'timed-out',
        state,
        error: `model step budget exhausted after ${maxSteps} steps`,
        cause: null,
        replyArtifact: null,
      } satisfies Omit<
        AlicizationEventLoopResult,
        'settlementError' | 'settlementCause'
      >
      return await settleParticipant(result)
    }
    catch (error) {
      const timeoutReason = resolveAlicizationRuntimeTimeoutReason(
        liveTurn.controller.signal.reason,
      ) ?? resolveAlicizationRuntimeTimeoutReason(error)
      if (timeoutReason) {
        if (
          !claimTerminalAuthority(liveTurn, 'timed-out')
          && liveTurn.terminalAuthority !== 'timed-out'
        ) {
          throw error
        }
        try {
          await append('runtime.timed_out', {
            reason: errorMessage(liveTurn.controller.signal.reason ?? error),
            timeoutReason,
          }, 'runtime', `${input.scope.turnId}:terminal:timed-out`)
          settleCancellationDurability(liveTurn, null)
        }
        catch (timeoutPersistenceError) {
          settleCancellationDurability(liveTurn, timeoutPersistenceError)
          throw timeoutPersistenceError
        }
        return await settleParticipant({
          status: 'timed-out',
          state,
          error: errorMessage(liveTurn.controller.signal.reason ?? error),
          cause: liveTurn.controller.signal.reason ?? error,
          replyArtifact: null,
        })
      }

      if (
        liveTurn.terminalAuthority === 'cancelled'
        || controller.signal.aborted
      ) {
        try {
          const result = await cancelActiveTurn(controller.signal.reason ?? error)
          settleCancellationDurability(liveTurn, null)
          return result
        }
        catch (cancellationError) {
          settleCancellationDurability(liveTurn, cancellationError)
          throw cancellationError
        }
      }

      if (failureSurface === 'tool' && toolFailure.origin === 'none')
        throw error
      if (failureSurface === 'provider' && providerFailure.origin === 'none')
        throw error

      if (!claimTerminalAuthority(liveTurn, 'failed')) {
        if (liveTurn.terminalAuthority === 'completed' && state.terminalEventType === 'turn.completed') {
          return await settleParticipant({
            status: 'completed',
            state,
            error: null,
            cause: null,
            replyArtifact: state.committedDelivery?.artifact ?? null,
          })
        }
        throw error
      }

      if (
        toolFailure.origin === 'adapter-or-validation'
      ) {
        await appendActiveActionFailure(error)
      }
      if (
        failureSurface === 'provider'
        && providerFailure.origin === 'invocation-or-validation'
      ) {
        await append('provider.failed', {
          error: errorMessage(error),
          surface: failureSurface,
        })
      }
      else if (
        failureSurface === 'tool'
        && toolFailure.origin === 'adapter-or-validation'
      ) {
        await append('tool.failed', {
          error: errorMessage(error),
          surface: failureSurface,
        }, 'tool')
      }
      await append('turn.failed', {
        error: errorMessage(error),
        surface: failureSurface,
      }, 'runtime', `${input.scope.turnId}:terminal:failed`)
      const result = {
        status: 'failed',
        state,
        error: errorMessage(error),
        cause: error,
        replyArtifact: null,
      } satisfies Omit<
        AlicizationEventLoopResult,
        'settlementError' | 'settlementCause'
      >
      return await settleParticipant(result)
    }
    finally {
      if (
        (liveTurn.terminalAuthority === 'cancelled'
          || liveTurn.terminalAuthority === 'timed-out')
        && !liveTurn.cancellationDurabilitySettled
      ) {
        settleCancellationDurability(
          liveTurn,
          new Error(
            liveTurn.terminalAuthority === 'timed-out'
              ? 'runtime timeout ended without a durable terminal checkpoint'
              : 'runtime cancellation ended without a durable terminal checkpoint',
          ),
        )
      }
      input.signal?.removeEventListener('abort', onExternalAbort)
      if (liveTurns.get(input.scope.turnId) === liveTurn)
        liveTurns.delete(input.scope.turnId)
    }
  }

  async function cancelTurn(
    scope: AlicizationRuntimeEventScope,
    reason: unknown = 'runtime turn cancelled',
  ) {
    const liveTurn = liveTurns.get(scope.turnId)
    if (!liveTurn)
      return false
    assertSameScope(liveTurn.scope, scope)
    const modelStepStartDurability = liveTurn.modelStepStartDurability
    if (modelStepStartDurability) {
      if (!claimDeferredCancellation(liveTurn, reason))
        return false
      const durability = await modelStepStartDurability.promise
      if (durability.error)
        throw durability.error
      const cancellation = await liveTurn.cancellationDurability
      if (cancellation.error)
        throw cancellation.error
      return true
    }
    const terminalObservationDurability = liveTurn.terminalObservationDurability
    if (terminalObservationDurability) {
      if (!claimDeferredCancellation(liveTurn, reason))
        return false
      const durability = await terminalObservationDurability.promise
      if (durability.error)
        throw durability.error
      const cancellation = await liveTurn.cancellationDurability
      if (cancellation.error)
        throw cancellation.error
      return true
    }
    const replyDeliverySettlement = liveTurn.replyDeliverySettlement
    if (replyDeliverySettlement) {
      if (!claimDeferredCancellation(liveTurn, reason))
        return false
      const delivery = await replyDeliverySettlement.promise
      if (delivery.delivered)
        return false
      const cancellation = await liveTurn.cancellationDurability
      if (cancellation.error)
        throw cancellation.error
      return true
    }
    if (!claimTerminalAuthority(liveTurn, resolveTerminalCancellationStatus(reason)))
      return false
    liveTurn.controller.abort(reason)
    const durability = await liveTurn.cancellationDurability
    if (durability.error)
      throw durability.error
    return true
  }

  return {
    runTurn,
    cancelTurn,
  }
}
