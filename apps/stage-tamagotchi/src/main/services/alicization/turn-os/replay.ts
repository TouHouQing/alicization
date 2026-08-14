import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationRuntimeCheckpoint,
  AlicizationRuntimeDeliveryOwner,
} from './checkpoint-store'
import type {
  AlicizationRuntimeEventListOptions,
  AlicizationRuntimeEventScope,
} from './event-store'
import type { AlicizationRuntimeReplyArtifact } from './reply-artifact'
import type {
  AlicizationTurnRuntimeState,
} from './runtime-state'
import type {
  AlicizationReplayedToolProjection,
} from './tool-projection'

import {
  parseAlicizationRuntimeCheckpoint,
} from './checkpoint-store'
import {
  createAlicizationTurnRuntimeState,
  listAlicizationActiveActionIds,
  reduceAlicizationRuntimeEvent,
  restoreAlicizationTurnRuntimeState,
} from './runtime-state'
import {
  projectAlicizationRuntimeToolEvents,
} from './tool-projection'

export interface AlicizationRuntimeReplayReader {
  loadRuntimeCheckpoint: (
    scope: AlicizationRuntimeEventScope,
  ) => Promise<AlicizationRuntimeCheckpoint | null>
  listRuntimeEvents: (
    scope: AlicizationRuntimeEventScope,
    options?: AlicizationRuntimeEventListOptions,
  ) => Promise<AlicizationRuntimeEventEnvelope[]>
}

export interface AlicizationRuntimeReplayResult {
  checkpoint: AlicizationRuntimeCheckpoint | null
  tailEvents: AlicizationRuntimeEventEnvelope[]
  state: AlicizationTurnRuntimeState
  toolProjection: AlicizationReplayedToolProjection
  replyArtifact: AlicizationRuntimeReplyArtifact | null
  recoveryRequired: boolean
  reasonCodes: string[]
}

function readDeliveryOwnerFromEvents(
  events: AlicizationRuntimeEventEnvelope[],
): AlicizationRuntimeDeliveryOwner | null {
  for (const event of events) {
    if (event.eventType !== 'turn.accepted')
      continue
    const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
      ? event.payload as Record<string, unknown>
      : null
    if (payload?.deliveryOwner === 'inline' || payload?.deliveryOwner === 'callback')
      return payload.deliveryOwner
  }
  return null
}

function assertCheckpointScope(
  scope: AlicizationRuntimeEventScope,
  checkpoint: AlicizationRuntimeCheckpoint,
) {
  if (
    scope.turnId !== checkpoint.turnId
    || scope.cardId !== checkpoint.cardId
    || scope.userId !== checkpoint.userId
    || scope.conversationId !== checkpoint.conversationId
  ) {
    throw new Error('runtime replay checkpoint scope does not match the requested turn scope')
  }
}

function buildRecoveryReasons(state: AlicizationTurnRuntimeState) {
  const activeActionIds = listAlicizationActiveActionIds(state)
  const reasonCodes: string[] = []
  if (activeActionIds.length > 0)
    reasonCodes.push('runtime-replay:active-actions-unsettled')
  if (activeActionIds.some(actionId => state.actions[actionId]?.pendingTerminalStatus))
    reasonCodes.push('runtime-replay:terminal-event-awaiting-observation')
  if (activeActionIds.some(actionId => state.actions[actionId]?.completionPendingObservation))
    reasonCodes.push('runtime-replay:completion-awaiting-observation')
  if (Object.keys(state.pendingActionSettlements).length > 0)
    reasonCodes.push('runtime-replay:action-settlement-pending')
  if (state.terminalEventType && activeActionIds.length > 0)
    reasonCodes.push('runtime-replay:terminal-turn-has-active-actions')
  if (state.pendingDelivery)
    reasonCodes.push('runtime-replay:delivery-pending')
  if (state.issues.some(issue => issue.code === 'orphan-reply-commit'))
    reasonCodes.push('runtime-replay:orphan-reply-commit')
  if (
    state.terminalEventType === 'turn.completed'
    && (
      !state.replyCommitted
      || state.pendingDelivery !== null
      || state.committedDelivery === null
    )
  ) {
    reasonCodes.push('runtime-replay:completed-without-reply-commit')
  }
  if (state.replyCommitted && !state.terminalEventType)
    reasonCodes.push('runtime-replay:reply-committed-without-turn-terminal')
  if (state.sequence > 0 && !state.terminalEventType)
    reasonCodes.push('runtime-replay:turn-started-without-terminal')
  return reasonCodes
}

export async function replayTurn(input: {
  scope: AlicizationRuntimeEventScope
  reader: AlicizationRuntimeReplayReader
  deliveryOwner?: AlicizationRuntimeDeliveryOwner
}): Promise<AlicizationRuntimeReplayResult> {
  const persistedCheckpoint = await input.reader.loadRuntimeCheckpoint(input.scope)
  const checkpoint = persistedCheckpoint
    ? parseAlicizationRuntimeCheckpoint(persistedCheckpoint)
    : null
  if (checkpoint)
    assertCheckpointScope(input.scope, checkpoint)

  const completeEvents = await input.reader.listRuntimeEvents(input.scope, {
    afterSequence: 0,
  })
  const tailEvents = checkpoint
    ? completeEvents.filter(event => event.sequence > checkpoint.sequence)
    : completeEvents
  const deliveryOwner = checkpoint?.deliveryOwner
    ?? input.deliveryOwner
    ?? readDeliveryOwnerFromEvents(completeEvents)
  if (!deliveryOwner)
    throw new Error('runtime replay delivery owner is missing from persisted facts')
  let state = checkpoint
    ? restoreAlicizationTurnRuntimeState(checkpoint)
    : createAlicizationTurnRuntimeState(input.scope, deliveryOwner)

  for (const event of tailEvents)
    state = reduceAlicizationRuntimeEvent(state, event)

  const toolProjection = projectAlicizationRuntimeToolEvents(completeEvents)
  const reasonCodes = [
    ...new Set([
      ...buildRecoveryReasons(state),
      ...toolProjection.recoveryReasonCodes,
    ]),
  ]
  return {
    checkpoint,
    tailEvents,
    state,
    toolProjection,
    replyArtifact: state.committedDelivery?.artifact ?? null,
    recoveryRequired: reasonCodes.length > 0,
    reasonCodes,
  }
}
