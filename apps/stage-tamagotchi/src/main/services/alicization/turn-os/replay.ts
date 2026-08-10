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
import type {
  AlicizationTurnRuntimeState,
} from './runtime-state'

import {
  parseAlicizationRuntimeCheckpoint,
} from './checkpoint-store'
import {
  createAlicizationTurnRuntimeState,
  listAlicizationActiveActionIds,
  reduceAlicizationRuntimeEvent,
  restoreAlicizationTurnRuntimeState,
} from './runtime-state'

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
  recoveryRequired: boolean
  reasonCodes: string[]
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
  deliveryOwner: AlicizationRuntimeDeliveryOwner
}): Promise<AlicizationRuntimeReplayResult> {
  const persistedCheckpoint = await input.reader.loadRuntimeCheckpoint(input.scope)
  const checkpoint = persistedCheckpoint
    ? parseAlicizationRuntimeCheckpoint(persistedCheckpoint)
    : null
  if (checkpoint)
    assertCheckpointScope(input.scope, checkpoint)

  const tailEvents = await input.reader.listRuntimeEvents(input.scope, {
    afterSequence: checkpoint?.sequence ?? 0,
  })
  let state = checkpoint
    ? restoreAlicizationTurnRuntimeState(checkpoint)
    : createAlicizationTurnRuntimeState(input.scope, input.deliveryOwner)

  for (const event of tailEvents)
    state = reduceAlicizationRuntimeEvent(state, event)

  const reasonCodes = buildRecoveryReasons(state)
  return {
    checkpoint,
    tailEvents,
    state,
    recoveryRequired: reasonCodes.length > 0,
    reasonCodes,
  }
}
