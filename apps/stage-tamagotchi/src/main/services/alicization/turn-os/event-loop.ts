import type {
  AlicizationActionObservationLink,
  AlicizationRuntimeEventEnvelope,
  AlicizationRuntimeEventSource,
  AlicizationRuntimeEventType,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationRuntimeCheckpoint,
  AlicizationRuntimeDeliveryOwner,
} from './checkpoint-store'
import type { AlicizationRuntimeEventScope } from './event-store'
import type {
  AlicizationTurnRuntimeState,
} from './runtime-state'

import {
  createAlicizationRuntimeEvent,
  parseAlicizationActionObservation,
} from '@proj-alicization/stage-shared'

import {
  createAlicizationReplyDeliveryIntent,
  createAlicizationTurnRuntimeState,
  listAlicizationActiveActionIds,
  reduceAlicizationRuntimeEvent,
  toAlicizationRuntimeCheckpoint,
} from './runtime-state'

export interface AlicizationModelAction {
  actionId: string
  toolCallId: string | null
  qualifiedToolName: string
  input: unknown
}

export interface AlicizationModelObservation extends AlicizationActionObservationLink {
  output?: unknown
}

export interface AlicizationModelTextReply {
  text: string
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

export interface AlicizationEventLoopRuntimeView extends AlicizationTurnRuntimeState {
  abortSignal: AbortSignal
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

export interface AlicizationEventLoopResult {
  status: 'completed' | 'failed' | 'cancelled' | 'timed-out'
  state: AlicizationTurnRuntimeState
  error: string | null
}

interface LiveTurn {
  scope: AlicizationRuntimeEventScope
  controller: AbortController
  terminalEventType: AlicizationRuntimeEventType | null
  terminalAuthority: 'open' | AlicizationEventLoopResult['status']
  cancellationDurability: Promise<{ error: unknown | null }>
  resolveCancellationDurability: (result: { error: unknown | null }) => void
  cancellationDurabilitySettled: boolean
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'unknown error')
}

function abortError(reason?: unknown) {
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
    qualifiedToolName: parseRequiredText(input.qualifiedToolName, 'model qualifiedToolName'),
    input: input.input,
  }
}

function parseTextReply(input: AlicizationModelTextReply): AlicizationModelTextReply {
  return {
    text: parseRequiredText(input.text, 'model reply text'),
  }
}

function runtimeView(
  state: AlicizationTurnRuntimeState,
  abortSignal: AbortSignal,
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
    pendingDelivery: state.pendingDelivery
      ? { ...state.pendingDelivery }
      : null,
    committedDelivery: state.committedDelivery
      ? { ...state.committedDelivery }
      : null,
    issues: [...state.issues],
    abortSignal,
  }
}

function actionTerminalEventType(
  outcome: AlicizationActionObservationLink['outcome'],
): AlicizationRuntimeEventType {
  if (outcome === 'success')
    return 'action.completed'
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
      cancellationDurability,
      resolveCancellationDurability,
      cancellationDurabilitySettled: false,
    }
    liveTurns.set(input.scope.turnId, liveTurn)

    const onExternalAbort = () => {
      if (claimTerminalAuthority(liveTurn, 'cancelled'))
        controller.abort(input.signal?.reason)
    }
    if (input.signal?.aborted) {
      claimTerminalAuthority(liveTurn, 'cancelled')
      controller.abort(input.signal.reason)
    }
    else {
      input.signal?.addEventListener('abort', onExternalAbort, { once: true })
    }

    let state = createAlicizationTurnRuntimeState(input.scope, input.deliveryOwner)
    let failureSurface: 'context' | 'provider' | 'tool' | 'delivery' = 'context'
    let currentActionId: string | null = null
    const toolFailure = {
      origin: 'none' as 'none' | 'adapter-or-validation',
    }

    const append = async (
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
      state = reduceAlicizationRuntimeEvent(state, persistedEvent)
      liveTurn.terminalEventType = state.terminalEventType
      await options.persistence.saveRuntimeCheckpoint(
        toAlicizationRuntimeCheckpoint(state, now()),
      )
      return persistedEvent
    }

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

    const cancelActiveTurn = async (reason: unknown): Promise<AlicizationEventLoopResult> => {
      if (liveTurn.terminalAuthority === 'open')
        claimTerminalAuthority(liveTurn, 'cancelled')
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
      if (state.terminalEventType !== 'runtime.cancelled') {
        await append('runtime.cancelled', {
          reason: errorMessage(reason),
        }, 'runtime', `${input.scope.turnId}:terminal:cancelled`)
      }
      return {
        status: 'cancelled',
        state,
        error: errorMessage(reason),
      }
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
          runtimeView(state, controller.signal),
        ),
        controller.signal,
      )
      throwIfAborted(controller.signal)
      await append('context.assembly.completed', {})

      for (let stepIndex = 1; stepIndex <= maxSteps; stepIndex++) {
        throwIfAborted(controller.signal)
        failureSurface = 'provider'
        await append('model.step.started', {
          stepIndex,
        }, 'model')
        const step = await raceWithAbort(
          () => options.participant.runModelStep(
            context,
            runtimeView(state, controller.signal),
          ),
          controller.signal,
        )
        throwIfAborted(controller.signal)

        if (step.kind === 'action') {
          const action = parseModelAction(step.action)
          if (state.actions[action.actionId])
            throw new Error(`model action ${action.actionId} already exists in this turn`)

          currentActionId = action.actionId
          await append('model.tool_call.proposed', {
            actionId: action.actionId,
            toolCallId: action.toolCallId,
            qualifiedToolName: action.qualifiedToolName,
            arguments: action.input,
          }, 'model')
          await append('model.step.completed', {
            stepIndex,
            outcome: 'action',
          }, 'model')
          await append('action.started', {
            actionId: action.actionId,
            toolCallId: action.toolCallId,
            qualifiedToolName: action.qualifiedToolName,
          })

          failureSurface = 'tool'
          toolFailure.origin = 'none'
          let observation: AlicizationModelObservation
          let observationLink: AlicizationActionObservationLink
          try {
            observation = await raceWithAbort(
              () => options.participant.executeAction(
                action,
                runtimeView(state, controller.signal),
              ),
              controller.signal,
            )
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

          await append('action.observation', {
            ...observationLink,
            ...('output' in observation ? { output: observation.output } : {}),
          }, 'tool')
          throwIfAborted(controller.signal)
          await append(actionTerminalEventType(observationLink.outcome), {
            actionId: action.actionId,
            toolCallId: observationLink.toolCallId,
          }, 'tool')
          currentActionId = null
          continue
        }

        const reply = parseTextReply(step.reply)
        const deliveryIntent = createAlicizationReplyDeliveryIntent(
          input.scope,
          input.deliveryOwner,
          reply.text,
        )
        await append('model.text.delta', {
          text: reply.text,
        }, 'model')
        await append('model.step.completed', {
          stepIndex,
          outcome: 'reply',
          ...deliveryIntent,
        }, 'model', `${deliveryIntent.deliveryId}:intent`)
        failureSurface = 'delivery'
        await raceWithAbort(
          () => options.participant.settleReply(
            reply,
            runtimeView(state, controller.signal),
          ),
          controller.signal,
        )
        throwIfAborted(controller.signal)
        if (!claimTerminalAuthority(liveTurn, 'completed'))
          throw abortError(controller.signal.reason)
        await append('assistant.reply.committed', {
          ...deliveryIntent,
        }, 'model', `${deliveryIntent.replyId}:committed`)
        await append(
          'turn.completed',
          {},
          'runtime',
          `${input.scope.turnId}:terminal:completed`,
        )
        return {
          status: 'completed',
          state,
          error: null,
        }
      }

      if (!claimTerminalAuthority(liveTurn, 'timed-out'))
        throw abortError(controller.signal.reason)
      await append('runtime.timed_out', {
        reason: `model step budget exhausted after ${maxSteps} steps`,
      }, 'runtime', `${input.scope.turnId}:terminal:timed-out`)
      return {
        status: 'timed-out',
        state,
        error: `model step budget exhausted after ${maxSteps} steps`,
      }
    }
    catch (error) {
      if (
        liveTurn.terminalAuthority === 'cancelled'
        || controller.signal.aborted
        || (error instanceof Error && error.name === 'AbortError')
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

      if (!claimTerminalAuthority(liveTurn, 'failed')) {
        if (liveTurn.terminalAuthority === 'completed' && state.terminalEventType === 'turn.completed') {
          return {
            status: 'completed',
            state,
            error: null,
          }
        }
        throw error
      }

      if (
        toolFailure.origin === 'adapter-or-validation'
        && currentActionId
        && state.actions[currentActionId]?.status === 'active'
      ) {
        const action = state.actions[currentActionId]!
        await appendTerminalActionObservation({
          actionId: currentActionId,
          toolCallId: action.toolCallId,
          outcome: 'failure',
          error: errorMessage(error),
        })
        await append('action.failed', {
          actionId: currentActionId,
          toolCallId: action.toolCallId,
          error: errorMessage(error),
        }, 'tool')
      }
      if (failureSurface === 'provider') {
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
      return {
        status: 'failed',
        state,
        error: errorMessage(error),
      }
    }
    finally {
      if (
        liveTurn.terminalAuthority === 'cancelled'
        && !liveTurn.cancellationDurabilitySettled
      ) {
        settleCancellationDurability(
          liveTurn,
          new Error('runtime cancellation ended without a durable terminal checkpoint'),
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
    if (!claimTerminalAuthority(liveTurn, 'cancelled'))
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
