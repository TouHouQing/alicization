import type {
  AlicizationActionObservationLink,
  AlicizationActionSettlement,
  AlicizationRuntimeEventEnvelope,
  AlicizationRuntimeEventType,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationRuntimeCheckpoint,
  AlicizationRuntimeCheckpointStatus,
  AlicizationRuntimeDeliveryOwner,
} from './checkpoint-store'
import type { AlicizationRuntimeEventScope } from './event-store'
import type {
  AlicizationRuntimeReplyDeliveryIntent,
} from './reply-artifact'

import {
  parseAlicizationActionObservation,
  parseAlicizationActionSettlement,
} from '@proj-alicization/stage-shared'

import {
  assertAlicizationRuntimeReplyDeliveryScope,
  parseAlicizationRuntimeReplyDeliveryIdentity,
  parseAlicizationRuntimeReplyDeliveryIntent,
} from './reply-artifact'

export type AlicizationActionRuntimeStatus
  = | 'active'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'rejected'
    | 'dead-lettered'

export const alicizationTurnRuntimeIssueCodes = [
  'conflicting-action-terminal',
  'duplicate-reply-commit',
  'late-action-event',
  'late-reply-commit',
  'late-turn-terminal',
  'completed-without-reply-commit',
  'orphan-action-event',
  'orphan-reply-commit',
  'terminal-turn-active-actions',
  'tool-call-id-drift',
] as const
export type AlicizationTurnRuntimeIssueCode = typeof alicizationTurnRuntimeIssueCodes[number]

export interface AlicizationActionRuntimeObservation extends AlicizationActionObservationLink {
  output?: unknown
}

export interface AlicizationActionRuntimeState {
  actionId: string
  toolCallId: string | null
  status: AlicizationActionRuntimeStatus
  terminalObservationId: string | null
  lastObservation: AlicizationActionRuntimeObservation | null
  outcome: AlicizationActionObservationLink['outcome'] | null
  pendingTerminalStatus: AlicizationActionRuntimeStatus | null
  completionPendingObservation: boolean
  restoredFromCheckpoint: boolean
  lateEventCount: number
  lastSequence: number
}

export interface AlicizationTurnRuntimeIssue {
  code: AlicizationTurnRuntimeIssueCode
  sequence: number
  actionId?: string
}

export interface AlicizationTurnRuntimeState extends AlicizationRuntimeEventScope {
  sequence: number
  status: AlicizationRuntimeCheckpointStatus
  deliveryOwner: AlicizationRuntimeDeliveryOwner
  actions: Record<string, AlicizationActionRuntimeState>
  pendingActionSettlements: Record<string, AlicizationActionSettlement>
  replyCommitted: boolean
  pendingDelivery: AlicizationRuntimeReplyDeliveryIntent | null
  committedDelivery: AlicizationRuntimeReplyDeliveryIntent | null
  terminalEventType: AlicizationRuntimeEventType | null
  issues: AlicizationTurnRuntimeIssue[]
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`${label} payload must be an object`)
  return value as Record<string, unknown>
}

function parseRequiredId(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${label} must not be empty`)
  return value.trim()
}

function parseNullableId(value: unknown, label: string) {
  if (value === undefined || value === null)
    return null
  return parseRequiredId(value, label)
}

function parseDeliveryOwner(value: unknown): AlicizationRuntimeDeliveryOwner {
  if (value !== 'inline' && value !== 'callback')
    throw new TypeError('runtime delivery owner must be inline or callback')
  return value
}

function assertSameScope(
  state: AlicizationTurnRuntimeState,
  event: AlicizationRuntimeEventEnvelope,
) {
  if (
    state.turnId !== event.turnId
    || state.cardId !== event.cardId
    || state.userId !== event.userId
    || state.conversationId !== event.conversationId
  ) {
    throw new Error('runtime event scope does not match the turn runtime scope')
  }
}

function cloneState(state: AlicizationTurnRuntimeState, sequence: number): AlicizationTurnRuntimeState {
  return {
    ...state,
    sequence,
    actions: { ...state.actions },
    pendingActionSettlements: Object.fromEntries(
      Object.entries(state.pendingActionSettlements).map(([settlementId, settlement]) => [
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
  }
}

function appendIssue(
  state: AlicizationTurnRuntimeState,
  issue: AlicizationTurnRuntimeIssue,
) {
  state.issues.push(issue)
}

function actionStatusFromOutcome(
  outcome: AlicizationActionObservationLink['outcome'],
): AlicizationActionRuntimeStatus {
  if (outcome === 'success')
    return 'completed'
  if (outcome === 'failure')
    return 'failed'
  return outcome
}

function actionStatusFromTerminalEvent(
  eventType: AlicizationRuntimeEventType,
): AlicizationActionRuntimeStatus | null {
  if (eventType === 'action.failed')
    return 'failed'
  if (eventType === 'action.cancelled')
    return 'cancelled'
  if (eventType === 'action.rejected')
    return 'rejected'
  if (eventType === 'action.dead_lettered')
    return 'dead-lettered'
  return null
}

function outcomeMatchesActionStatus(
  outcome: AlicizationActionObservationLink['outcome'],
  status: AlicizationActionRuntimeStatus,
) {
  if (status === 'completed')
    return outcome === 'success'
  if (status === 'failed' || status === 'dead-lettered')
    return outcome === 'failure'
  return outcome === status
}

function terminalTurnStatus(
  eventType: AlicizationRuntimeEventType,
): AlicizationRuntimeCheckpointStatus | null {
  if (eventType === 'turn.completed')
    return 'completed'
  if (eventType === 'turn.failed')
    return 'failed'
  if (eventType === 'runtime.cancelled')
    return 'cancelled'
  if (eventType === 'runtime.timed_out')
    return 'timed-out'
  if (eventType === 'runtime.dead_lettered')
    return 'dead-lettered'
  return null
}

function parseReplyDeliveryIntent(
  state: AlicizationTurnRuntimeState,
  payload: unknown,
) {
  const record = asRecord(payload, 'reply delivery event')
  const intent = parseAlicizationRuntimeReplyDeliveryIntent({
    replyId: record.replyId,
    deliveryId: record.deliveryId,
    contentHash: record.contentHash,
    artifactHash: record.artifactHash,
    artifact: record.artifact,
  })
  assertAlicizationRuntimeReplyDeliveryScope(
    state,
    state.deliveryOwner,
    intent,
  )
  return intent
}

function parseReplyDeliveryIdentity(
  state: AlicizationTurnRuntimeState,
  payload: unknown,
) {
  const identity = parseAlicizationRuntimeReplyDeliveryIdentity(payload)
  assertAlicizationRuntimeReplyDeliveryScope(
    state,
    state.deliveryOwner,
    identity,
  )
  return identity
}

function parseActionIdentity(payload: unknown) {
  const record = asRecord(payload, 'action event')
  return {
    actionId: parseRequiredId(record.actionId, 'actionId'),
    toolCallId: parseNullableId(record.toolCallId, 'toolCallId'),
  }
}

function parseActionObservation(payload: unknown): AlicizationActionRuntimeObservation {
  const observation = parseAlicizationActionObservation(payload)
  const record = asRecord(payload, 'action observation')
  return {
    ...observation,
    ...(Object.prototype.hasOwnProperty.call(record, 'output')
      ? { output: record.output }
      : {}),
  }
}

function markLateActionEvent(
  state: AlicizationTurnRuntimeState,
  action: AlicizationActionRuntimeState,
) {
  const nextAction = {
    ...action,
    lateEventCount: action.lateEventCount + 1,
    lastSequence: state.sequence,
  }
  state.actions[action.actionId] = nextAction
  appendIssue(state, {
    code: 'late-action-event',
    sequence: state.sequence,
    actionId: action.actionId,
  })
}

function settleActionFromObservation(
  state: AlicizationTurnRuntimeState,
  observation: AlicizationActionRuntimeObservation,
) {
  const action = state.actions[observation.actionId]
  if (!action) {
    appendIssue(state, {
      code: 'orphan-action-event',
      sequence: state.sequence,
      actionId: observation.actionId,
    })
    return
  }

  if (action.status !== 'active') {
    markLateActionEvent(state, action)
    return
  }

  if (action.toolCallId && action.toolCallId !== observation.toolCallId) {
    appendIssue(state, {
      code: 'tool-call-id-drift',
      sequence: state.sequence,
      actionId: action.actionId,
    })
    return
  }

  if (!observation.terminal) {
    state.actions[action.actionId] = {
      ...action,
      toolCallId: action.toolCallId ?? observation.toolCallId,
      lastObservation: observation,
      lastSequence: state.sequence,
    }
    return
  }

  const observedStatus = actionStatusFromOutcome(observation.outcome)
  if (
    action.pendingTerminalStatus
    && !outcomeMatchesActionStatus(observation.outcome, action.pendingTerminalStatus)
  ) {
    appendIssue(state, {
      code: 'conflicting-action-terminal',
      sequence: state.sequence,
      actionId: action.actionId,
    })
    return
  }

  state.actions[action.actionId] = {
    ...action,
    toolCallId: action.toolCallId ?? observation.toolCallId,
    status: action.pendingTerminalStatus ?? observedStatus,
    terminalObservationId: observation.observationId,
    lastObservation: observation,
    outcome: observation.outcome,
    pendingTerminalStatus: null,
    completionPendingObservation: false,
    lastSequence: state.sequence,
  }
}

function reduceActionStarted(
  state: AlicizationTurnRuntimeState,
  payload: unknown,
) {
  const { actionId, toolCallId } = parseActionIdentity(payload)
  const existing = state.actions[actionId]
  if (existing) {
    if (existing.status !== 'active')
      markLateActionEvent(state, existing)
    return
  }

  state.actions[actionId] = {
    actionId,
    toolCallId,
    status: 'active',
    terminalObservationId: null,
    lastObservation: null,
    outcome: null,
    pendingTerminalStatus: null,
    completionPendingObservation: false,
    restoredFromCheckpoint: false,
    lateEventCount: 0,
    lastSequence: state.sequence,
  }
}

function sameActionSettlement(
  left: AlicizationActionSettlement,
  right: AlicizationActionSettlement,
) {
  return left.settlementId === right.settlementId
    && left.actionId === right.actionId
    && left.toolCallId === right.toolCallId
    && left.observationId === right.observationId
}

function reduceActionSettlementStarted(
  state: AlicizationTurnRuntimeState,
  payload: unknown,
) {
  const settlement = parseAlicizationActionSettlement(payload)
  const existing = state.pendingActionSettlements[settlement.settlementId]
  if (existing) {
    if (!sameActionSettlement(existing, settlement))
      throw new Error(`action settlement ${settlement.settlementId} identity changed`)
    return
  }

  const action = state.actions[settlement.actionId]
  if (!action)
    throw new Error(`action settlement ${settlement.settlementId} references an unknown action`)
  if (action.status !== 'active')
    throw new Error(`action settlement ${settlement.settlementId} requires an active action`)
  if (action.toolCallId !== settlement.toolCallId) {
    throw new Error(
      `action settlement ${settlement.settlementId} toolCallId does not match its action`,
    )
  }
  if (Object.values(state.pendingActionSettlements).some(pending =>
    pending.actionId === settlement.actionId
    || pending.observationId === settlement.observationId,
  )) {
    throw new Error(
      `action settlement ${settlement.settlementId} duplicates a pending action or observation`,
    )
  }

  state.pendingActionSettlements[settlement.settlementId] = {
    ...settlement,
  }
}

function reduceActionSettlementCompleted(
  state: AlicizationTurnRuntimeState,
  payload: unknown,
) {
  const settlement = parseAlicizationActionSettlement(payload)
  const pending = state.pendingActionSettlements[settlement.settlementId]
  if (!pending)
    throw new Error(`action settlement ${settlement.settlementId} is not pending`)
  if (!sameActionSettlement(pending, settlement))
    throw new Error(`action settlement ${settlement.settlementId} identity changed`)

  const action = state.actions[settlement.actionId]
  if (
    !action
    || action.terminalObservationId !== settlement.observationId
    || action.toolCallId !== settlement.toolCallId
  ) {
    throw new Error(
      `action settlement ${settlement.settlementId} completed without its terminal observation`,
    )
  }

  delete state.pendingActionSettlements[settlement.settlementId]
}

function reduceActionCompleted(
  state: AlicizationTurnRuntimeState,
  payload: unknown,
) {
  const { actionId, toolCallId } = parseActionIdentity(payload)
  const action = state.actions[actionId]
  if (!action) {
    appendIssue(state, {
      code: 'orphan-action-event',
      sequence: state.sequence,
      actionId,
    })
    return
  }

  if (action.toolCallId && action.toolCallId !== toolCallId) {
    appendIssue(state, {
      code: 'tool-call-id-drift',
      sequence: state.sequence,
      actionId,
    })
    return
  }

  if (action.pendingTerminalStatus) {
    if (action.pendingTerminalStatus === 'completed') {
      state.actions[actionId] = {
        ...action,
        lastSequence: state.sequence,
      }
      return
    }
    appendIssue(state, {
      code: 'conflicting-action-terminal',
      sequence: state.sequence,
      actionId,
    })
    return
  }

  if (action.status === 'completed' && action.terminalObservationId) {
    state.actions[actionId] = {
      ...action,
      lastSequence: state.sequence,
    }
    return
  }

  if (action.status !== 'active') {
    appendIssue(state, {
      code: 'conflicting-action-terminal',
      sequence: state.sequence,
      actionId,
    })
    markLateActionEvent(state, action)
    return
  }

  state.actions[actionId] = {
    ...action,
    pendingTerminalStatus: 'completed',
    completionPendingObservation: true,
    lastSequence: state.sequence,
  }
}

function reduceActionTerminalFailure(
  state: AlicizationTurnRuntimeState,
  eventType: AlicizationRuntimeEventType,
  payload: unknown,
) {
  const status = actionStatusFromTerminalEvent(eventType)
  if (!status)
    return

  const { actionId, toolCallId } = parseActionIdentity(payload)
  const action = state.actions[actionId]
  if (!action) {
    appendIssue(state, {
      code: 'orphan-action-event',
      sequence: state.sequence,
      actionId,
    })
    return
  }

  if (action.toolCallId && action.toolCallId !== toolCallId) {
    appendIssue(state, {
      code: 'tool-call-id-drift',
      sequence: state.sequence,
      actionId,
    })
    return
  }

  if (action.pendingTerminalStatus) {
    if (action.pendingTerminalStatus === status) {
      state.actions[actionId] = {
        ...action,
        lastSequence: state.sequence,
      }
      return
    }
    appendIssue(state, {
      code: 'conflicting-action-terminal',
      sequence: state.sequence,
      actionId,
    })
    return
  }

  if (action.status !== 'active') {
    if (action.status === status) {
      state.actions[actionId] = {
        ...action,
        lastSequence: state.sequence,
      }
      return
    }
    if (
      status === 'dead-lettered'
      && action.status === 'failed'
      && action.outcome === 'failure'
      && action.terminalObservationId
    ) {
      state.actions[actionId] = {
        ...action,
        status,
        lastSequence: state.sequence,
      }
      return
    }
    appendIssue(state, {
      code: 'conflicting-action-terminal',
      sequence: state.sequence,
      actionId,
    })
    markLateActionEvent(state, action)
    return
  }

  state.actions[actionId] = {
    ...action,
    pendingTerminalStatus: status,
    completionPendingObservation: status === 'completed',
    lastSequence: state.sequence,
  }
}

function reduceActionNonTerminal(
  state: AlicizationTurnRuntimeState,
  payload: unknown,
) {
  const { actionId, toolCallId } = parseActionIdentity(payload)
  const action = state.actions[actionId]
  if (!action) {
    appendIssue(state, {
      code: 'orphan-action-event',
      sequence: state.sequence,
      actionId,
    })
    return
  }
  if (
    !toolCallId
    || !action.toolCallId
    || action.toolCallId !== toolCallId
  ) {
    appendIssue(state, {
      code: 'tool-call-id-drift',
      sequence: state.sequence,
      actionId,
    })
    return
  }
  if (action.status !== 'active') {
    markLateActionEvent(state, action)
    return
  }
  state.actions[actionId] = {
    ...action,
    lastSequence: state.sequence,
  }
}

function settleTurn(
  state: AlicizationTurnRuntimeState,
  eventType: AlicizationRuntimeEventType,
  status: AlicizationRuntimeCheckpointStatus,
) {
  if (state.terminalEventType) {
    if (state.terminalEventType !== eventType) {
      appendIssue(state, {
        code: 'late-turn-terminal',
        sequence: state.sequence,
      })
    }
    return
  }

  state.status = status
  state.terminalEventType = eventType
  if (eventType === 'runtime.cancelled')
    state.pendingDelivery = null
  if (eventType === 'turn.completed' && !state.replyCommitted) {
    appendIssue(state, {
      code: 'completed-without-reply-commit',
      sequence: state.sequence,
    })
  }
  if (listAlicizationActiveActionIds(state).length > 0) {
    appendIssue(state, {
      code: 'terminal-turn-active-actions',
      sequence: state.sequence,
    })
  }
}

export function createAlicizationTurnRuntimeState(
  scope: AlicizationRuntimeEventScope,
  deliveryOwner: AlicizationRuntimeDeliveryOwner,
): AlicizationTurnRuntimeState {
  return {
    ...scope,
    sequence: 0,
    status: 'accepted',
    deliveryOwner,
    actions: {},
    pendingActionSettlements: {},
    replyCommitted: false,
    pendingDelivery: null,
    committedDelivery: null,
    terminalEventType: null,
    issues: [],
  }
}

export function restoreAlicizationTurnRuntimeState(
  checkpoint: AlicizationRuntimeCheckpoint,
): AlicizationTurnRuntimeState {
  const actions = Object.fromEntries(
    Object.entries(checkpoint.projection.actions)
      .map(([actionId, action]) => [
        actionId,
        {
          ...action,
          lastObservation: action.lastObservation
            ? structuredClone(action.lastObservation)
            : null,
          restoredFromCheckpoint: true,
        },
      ]),
  )

  return {
    turnId: checkpoint.turnId,
    cardId: checkpoint.cardId,
    userId: checkpoint.userId,
    conversationId: checkpoint.conversationId,
    sequence: checkpoint.sequence,
    status: checkpoint.status,
    deliveryOwner: checkpoint.deliveryOwner,
    actions,
    pendingActionSettlements: Object.fromEntries(
      Object.entries(checkpoint.projection.pendingActionSettlements)
        .map(([settlementId, settlement]) => [
          settlementId,
          { ...settlement },
        ]),
    ),
    replyCommitted: checkpoint.projection.replyCommitted,
    pendingDelivery: checkpoint.projection.pendingDelivery
      ? structuredClone(checkpoint.projection.pendingDelivery)
      : null,
    committedDelivery: checkpoint.projection.committedDelivery
      ? structuredClone(checkpoint.projection.committedDelivery)
      : null,
    terminalEventType: checkpoint.projection.terminalEventType,
    issues: checkpoint.projection.issues.map(issue => ({
      ...issue,
      code: issue.code as AlicizationTurnRuntimeIssue['code'],
    })),
  }
}

export function reduceAlicizationRuntimeEvent(
  state: AlicizationTurnRuntimeState,
  event: AlicizationRuntimeEventEnvelope,
): AlicizationTurnRuntimeState {
  assertSameScope(state, event)
  if (event.sequence !== state.sequence + 1) {
    throw new Error(
      `runtime event sequence ${event.sequence} does not follow cursor ${state.sequence}`,
    )
  }

  const next = cloneState(state, event.sequence)

  if (event.eventType === 'turn.accepted') {
    const payload = asRecord(event.payload, 'turn.accepted')
    const deliveryOwner = parseDeliveryOwner(payload.deliveryOwner)
    if (deliveryOwner !== next.deliveryOwner)
      throw new Error('runtime event delivery owner does not match the turn runtime delivery owner')
    if (!next.terminalEventType)
      next.status = 'accepted'
    return next
  }

  if (event.eventType === 'action.started') {
    if (next.terminalEventType) {
      const { actionId } = parseActionIdentity(event.payload)
      appendIssue(next, {
        code: 'late-action-event',
        sequence: next.sequence,
        actionId,
      })
      return next
    }
    reduceActionStarted(next, event.payload)
    next.status = 'running'
    return next
  }

  if (event.eventType === 'action.observation') {
    settleActionFromObservation(next, parseActionObservation(event.payload))
    return next
  }

  if (event.eventType === 'action.settlement.started') {
    if (next.terminalEventType)
      throw new Error('action settlement cannot start after the turn became terminal')
    reduceActionSettlementStarted(next, event.payload)
    next.status = 'running'
    return next
  }

  if (event.eventType === 'action.settlement.completed') {
    reduceActionSettlementCompleted(next, event.payload)
    return next
  }

  if (event.eventType === 'action.completed') {
    reduceActionCompleted(next, event.payload)
    return next
  }

  if (
    event.eventType === 'action.failed'
    || event.eventType === 'action.cancelled'
    || event.eventType === 'action.rejected'
    || event.eventType === 'action.dead_lettered'
  ) {
    reduceActionTerminalFailure(next, event.eventType, event.payload)
    return next
  }

  if (
    event.eventType === 'action.progress'
    || event.eventType === 'action.output.delta'
    || event.eventType === 'action.permission.checked'
    || event.eventType === 'action.retry.scheduled'
  ) {
    reduceActionNonTerminal(next, event.payload)
    return next
  }

  if (event.eventType === 'model.step.completed') {
    const payload = asRecord(event.payload, 'model.step.completed')
    if (payload.outcome === 'reply' && !next.terminalEventType) {
      const intent = parseReplyDeliveryIntent(next, payload)
      if (
        next.pendingDelivery
        && (
          next.pendingDelivery.replyId !== intent.replyId
          || next.pendingDelivery.deliveryId !== intent.deliveryId
          || next.pendingDelivery.contentHash !== intent.contentHash
          || next.pendingDelivery.artifactHash !== intent.artifactHash
        )
      ) {
        throw new Error('runtime reply delivery intent content changed after it became pending')
      }
      next.pendingDelivery = intent
    }
    if (!next.terminalEventType)
      next.status = 'running'
    return next
  }

  if (event.eventType === 'assistant.reply.committed') {
    if (next.terminalEventType) {
      appendIssue(next, {
        code: 'late-reply-commit',
        sequence: next.sequence,
      })
      return next
    }
    if (next.replyCommitted) {
      const duplicateIntent = parseReplyDeliveryIdentity(next, event.payload)
      if (
        !next.committedDelivery
        || duplicateIntent.replyId !== next.committedDelivery.replyId
        || duplicateIntent.deliveryId !== next.committedDelivery.deliveryId
        || duplicateIntent.contentHash !== next.committedDelivery.contentHash
        || duplicateIntent.artifactHash !== next.committedDelivery.artifactHash
      ) {
        throw new Error('runtime duplicate reply commit does not match the committed delivery identity')
      }
      appendIssue(next, {
        code: 'duplicate-reply-commit',
        sequence: next.sequence,
      })
    }
    else {
      if (!next.pendingDelivery) {
        appendIssue(next, {
          code: 'orphan-reply-commit',
          sequence: next.sequence,
        })
        return next
      }
      const committedIdentity = parseReplyDeliveryIdentity(next, event.payload)
      if (
        committedIdentity.replyId !== next.pendingDelivery.replyId
        || committedIdentity.deliveryId !== next.pendingDelivery.deliveryId
        || committedIdentity.contentHash !== next.pendingDelivery.contentHash
        || committedIdentity.artifactHash !== next.pendingDelivery.artifactHash
      ) {
        throw new Error('runtime reply commit does not match the pending delivery intent')
      }
      next.replyCommitted = true
      next.committedDelivery = {
        ...next.pendingDelivery,
      }
      next.pendingDelivery = null
    }
    return next
  }

  const terminalStatus = terminalTurnStatus(event.eventType)
  if (terminalStatus) {
    settleTurn(next, event.eventType, terminalStatus)
    return next
  }

  if (!next.terminalEventType) {
    if (
      event.eventType === 'context.assembly.started'
      || event.eventType === 'context.assembly.completed'
      || event.eventType === 'model.step.started'
      || event.eventType === 'model.text.delta'
      || event.eventType === 'model.tool_call.proposed'
      || event.eventType === 'model.memory_request.proposed'
      || event.eventType === 'model.skill_request.proposed'
      || event.eventType === 'model.clarification.proposed'
    ) {
      next.status = 'running'
    }
  }

  return next
}

export function listAlicizationActiveActionIds(
  state: AlicizationTurnRuntimeState,
) {
  return Object.values(state.actions)
    .filter(action => action.status === 'active')
    .map(action => action.actionId)
    .sort()
}

export function toAlicizationRuntimeCheckpoint(
  state: AlicizationTurnRuntimeState,
  updatedAt: number,
): AlicizationRuntimeCheckpoint {
  return {
    turnId: state.turnId,
    cardId: state.cardId,
    userId: state.userId,
    conversationId: state.conversationId,
    sequence: state.sequence,
    status: state.status,
    activeActionIds: listAlicizationActiveActionIds(state),
    deliveryOwner: state.deliveryOwner,
    projection: {
      actions: Object.fromEntries(
        Object.entries(state.actions).map(([actionId, action]) => [
          actionId,
          {
            actionId: action.actionId,
            toolCallId: action.toolCallId,
            status: action.status,
            terminalObservationId: action.terminalObservationId,
            lastObservation: action.lastObservation
              ? structuredClone(action.lastObservation)
              : null,
            outcome: action.outcome,
            pendingTerminalStatus: action.pendingTerminalStatus,
            completionPendingObservation: action.completionPendingObservation,
            lateEventCount: action.lateEventCount,
            lastSequence: action.lastSequence,
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
      replyCommitted: state.replyCommitted,
      pendingDelivery: state.pendingDelivery
        ? structuredClone(state.pendingDelivery)
        : null,
      committedDelivery: state.committedDelivery
        ? structuredClone(state.committedDelivery)
        : null,
      terminalEventType: state.terminalEventType,
      issues: state.issues.map(issue => ({ ...issue })),
    },
    schemaVersion: 3,
    updatedAt,
  }
}
