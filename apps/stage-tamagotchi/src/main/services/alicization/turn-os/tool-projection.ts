import type {
  AlicizationExecutionChannel,
  AlicizationRuntimeEventEnvelope,
  AlicizationRuntimeToolCardProjection,
  AlicizationRuntimeToolProgressSignal,
  AlicizationRuntimeToolProjectionFact,
  AlicizationRuntimeToolProjectionPhase,
  AlicizationRuntimeToolProjectionUpdate,
} from '@proj-alicization/stage-shared'

import {
  createAlicizationRuntimeToolProjectionReducer,
  normalizeAlicizationExecutionChannel,
  resolveAlicizationRuntimeToolResultPhase,
} from '@proj-alicization/stage-shared'

export interface AlicizationReplayedToolProjection {
  cards: AlicizationRuntimeToolCardProjection[]
  trace: AlicizationRuntimeToolProjectionUpdate[]
  recoveryRequired: boolean
  recoveryReasonCodes: string[]
}

export interface AlicizationRuntimeToolEventProjection {
  fact: AlicizationRuntimeToolProjectionFact
  update: AlicizationRuntimeToolProjectionUpdate
}

export interface AlicizationRuntimeToolEventProjector {
  project: (
    event: AlicizationRuntimeEventEnvelope,
  ) => AlicizationRuntimeToolEventProjection[]
  snapshot: () => AlicizationReplayedToolProjection
}

interface ToolIdentity {
  actionId: string
  toolCallId: string
  driftedToolCallId: string | null
  toolName: string
  selectedChannel: AlicizationExecutionChannel | null
  selectedChannelConfirmed: boolean
  startedAt: number
}

const capabilityChannels: Record<string, AlicizationExecutionChannel> = {
  'coding_agent.cli': 'cli',
  'coding_agent.codex': 'codex',
  'coding_agent.claude_code': 'claude-code',
}

const progressPhases = new Set<AlicizationRuntimeToolProjectionPhase>([
  'started',
  'running',
  'completed',
  'failed',
  'dead-lettered',
  'cancelled',
  'timeout',
])

const progressSignals = new Set<AlicizationRuntimeToolProgressSignal>([
  'liveness',
  'semantic-progress',
  'terminal',
])

const turnTerminalEventTypes = new Set<AlicizationRuntimeEventEnvelope['eventType']>([
  'turn.completed',
  'turn.failed',
  'runtime.timed_out',
  'runtime.cancelled',
  'runtime.dead_lettered',
])

function readRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readNonNegativeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, value)
    : null
}

function resolveSelectedChannel(
  payload: Record<string, unknown>,
  previous?: ToolIdentity,
) {
  if (previous?.selectedChannelConfirmed && previous.selectedChannel) {
    return {
      selectedChannel: previous.selectedChannel,
      selectedChannelConfirmed: true,
    }
  }

  const explicit = normalizeAlicizationExecutionChannel(payload.selectedChannel)
  if (explicit) {
    return {
      selectedChannel: explicit,
      selectedChannelConfirmed: true,
    }
  }

  if (previous?.selectedChannel) {
    return {
      selectedChannel: previous.selectedChannel,
      selectedChannelConfirmed: false,
    }
  }

  const capabilityId = readText(payload.capabilityId)
  const capabilityChannel = capabilityChannels[capabilityId]
  if (capabilityChannel) {
    return {
      selectedChannel: capabilityChannel,
      selectedChannelConfirmed: false,
    }
  }

  return {
    selectedChannel: normalizeAlicizationExecutionChannel(payload.providerToolName),
    selectedChannelConfirmed: false,
  }
}

function resolveToolName(
  payload: Record<string, unknown>,
  previous?: ToolIdentity,
) {
  return readText(payload.providerToolName)
    || previous?.toolName
    || readText(payload.capabilityId).split('.').at(-1)
    || 'tool'
}

function resolveToolIdentity(
  event: AlicizationRuntimeEventEnvelope,
  payload: Record<string, unknown>,
  actions: Map<string, ToolIdentity>,
) {
  const actionId = readText(payload.actionId)
  const previous = actionId ? actions.get(actionId) : undefined
  const observedToolCallId = readText(payload.toolCallId)
  const toolCallId = previous?.toolCallId || observedToolCallId
  if (!actionId || !toolCallId)
    return null

  const selectedChannel = resolveSelectedChannel(payload, previous)
  const identity: ToolIdentity = {
    actionId,
    toolCallId,
    driftedToolCallId: previous?.toolCallId
      && observedToolCallId
      && previous.toolCallId !== observedToolCallId
      ? observedToolCallId
      : null,
    toolName: resolveToolName(payload, previous),
    ...selectedChannel,
    startedAt: previous?.startedAt ?? event.occurredAt,
  }
  actions.set(actionId, identity)
  return identity
}

function traceToolCallIdDrift(
  reducer: ReturnType<typeof createAlicizationRuntimeToolProjectionReducer>,
  identity: ToolIdentity,
  fact: AlicizationRuntimeToolProjectionFact,
) {
  if (!identity.driftedToolCallId)
    return
  reducer.reduce({
    ...fact,
    toolCallId: identity.driftedToolCallId,
  }, {
    traceOnly: true,
  })
}

function elapsedSinceStart(
  event: AlicizationRuntimeEventEnvelope,
  payload: Record<string, unknown>,
  identity: ToolIdentity,
) {
  return readNonNegativeNumber(payload.elapsedMs)
    ?? Math.max(0, event.occurredAt - identity.startedAt)
}

function progressSignal(value: unknown) {
  return typeof value === 'string'
    && progressSignals.has(value as AlicizationRuntimeToolProgressSignal)
    ? value as AlicizationRuntimeToolProgressSignal
    : undefined
}

function progressPhase(value: unknown): AlicizationRuntimeToolProjectionPhase {
  return typeof value === 'string'
    && progressPhases.has(value as AlicizationRuntimeToolProjectionPhase)
    ? value as AlicizationRuntimeToolProjectionPhase
    : 'running'
}

function observationPhase(
  outcome: unknown,
  output: unknown,
  observationPayload: unknown,
): Extract<
  AlicizationRuntimeToolProjectionPhase,
  'completed' | 'failed' | 'dead-lettered' | 'cancelled' | 'timeout'
> {
  const outputPhase = resolveAlicizationRuntimeToolResultPhase(output)
  const observationPhase = resolveAlicizationRuntimeToolResultPhase(
    observationPayload,
  )
  if (outputPhase === 'timeout' || observationPhase === 'timeout')
    return 'timeout'
  if (
    outputPhase === 'dead-lettered'
    || observationPhase === 'dead-lettered'
  ) {
    return 'dead-lettered'
  }
  if (outputPhase === 'cancelled' || observationPhase === 'cancelled')
    return 'cancelled'
  if (outcome === 'success')
    return 'completed'
  if (outcome === 'cancelled')
    return 'cancelled'
  return 'failed'
}

function terminalEventPhase(
  eventType: AlicizationRuntimeEventEnvelope['eventType'],
): Extract<AlicizationRuntimeToolProjectionPhase, 'failed' | 'dead-lettered' | 'cancelled'> | null {
  if (eventType === 'action.cancelled')
    return 'cancelled'
  if (eventType === 'action.dead_lettered')
    return 'dead-lettered'
  if (eventType === 'action.failed')
    return 'failed'
  return null
}

function terminalTurnToolPhase(
  eventType: AlicizationRuntimeEventEnvelope['eventType'],
): Extract<AlicizationRuntimeToolProjectionPhase, 'failed' | 'dead-lettered' | 'cancelled' | 'timeout'> | null {
  if (eventType === 'runtime.cancelled')
    return 'cancelled'
  if (eventType === 'runtime.timed_out')
    return 'timeout'
  if (eventType === 'runtime.dead_lettered')
    return 'dead-lettered'
  if (eventType === 'turn.failed')
    return 'failed'
  return null
}

function terminalTurnToolErrorCode(
  eventType: AlicizationRuntimeEventEnvelope['eventType'],
) {
  if (eventType === 'runtime.cancelled')
    return 'RUNTIME_CANCELLED'
  if (eventType === 'runtime.dead_lettered')
    return 'RUNTIME_DEAD_LETTERED'
  if (eventType === 'runtime.timed_out')
    return 'RUNTIME_TIMED_OUT'
  if (eventType === 'turn.failed')
    return 'TURN_FAILED'
  return undefined
}

function outputPreview(payload: Record<string, unknown>) {
  return readText(payload.outputPreview)
    || readText(payload.delta)
    || readText(payload.text)
    || undefined
}

export function createAlicizationRuntimeToolEventProjector():
AlicizationRuntimeToolEventProjector {
  const reducer = createAlicizationRuntimeToolProjectionReducer()
  const actions = new Map<string, ToolIdentity>()
  const projectedEventIds = new Set<string>()
  let turnTerminal = false

  const snapshot = (): AlicizationReplayedToolProjection => {
    const cards = reducer.listCards()
    const recoveryRequired = cards.some(card => !card.terminal)
    return {
      cards,
      trace: reducer.listTrace().filter(update => update.traceOnly),
      recoveryRequired,
      recoveryReasonCodes: recoveryRequired
        ? ['runtime-replay:tool-actions-unsettled']
        : [],
    }
  }

  const project = (
    event: AlicizationRuntimeEventEnvelope,
  ): AlicizationRuntimeToolEventProjection[] => {
    const projected: AlicizationRuntimeToolEventProjection[] = []
    if (projectedEventIds.has(event.eventId))
      return projected
    projectedEventIds.add(event.eventId)

    const reduceProjectedFact = (
      identity: ToolIdentity,
      fact: AlicizationRuntimeToolProjectionFact,
      options?: {
        confirmSelectedChannel?: boolean
        traceOnly?: boolean
      },
    ) => {
      traceToolCallIdDrift(reducer, identity, fact)
      const update = reducer.reduce(fact, options)
      projected.push({
        fact,
        update,
      })
      return update
    }

    if (turnTerminal) {
      const payload = readRecord(event.payload)
      if (!payload)
        return projected
      if (
        event.eventType === 'model.tool_call.proposed'
        || event.eventType === 'action.started'
        || event.eventType === 'action.progress'
        || event.eventType === 'action.output.delta'
        || event.eventType === 'action.observation'
        || terminalEventPhase(event.eventType)
      ) {
        const identity = resolveToolIdentity(event, payload, actions)
        if (!identity)
          return projected
        const fact = {
          type: event.eventType === 'action.observation'
            ? 'tool-result'
            : event.eventType === 'action.progress' || event.eventType === 'action.output.delta'
              ? 'tool-progress'
              : 'tool-call',
          toolCallId: identity.toolCallId,
          toolName: identity.toolName,
          selectedChannel: identity.selectedChannel,
          ...(event.eventType === 'action.progress' || event.eventType === 'action.output.delta'
            ? {
                phase: progressPhase(payload.phase),
                elapsedMs: elapsedSinceStart(event, payload, identity),
                timeoutMs: readNonNegativeNumber(payload.timeoutMs) ?? undefined,
                errorCode: readText(payload.errorCode) || undefined,
                errorMessage: readText(payload.errorMessage) || undefined,
              }
            : {}),
        } as AlicizationRuntimeToolProjectionFact
        reduceProjectedFact(identity, fact, {
          traceOnly: true,
        })
      }
      return projected
    }
    if (turnTerminalEventTypes.has(event.eventType)) {
      const payload = readRecord(event.payload) ?? {}
      const phase = terminalTurnToolPhase(event.eventType)
      if (phase) {
        const errorCode = readText(payload.errorCode)
          || terminalTurnToolErrorCode(event.eventType)
          || undefined
        const errorMessage = readText(payload.errorMessage)
          || readText(payload.error)
          || readText(payload.reason)
          || undefined
        for (const identity of actions.values()) {
          const card = reducer.getCard(identity.toolCallId)
          if (!card || card.terminal)
            continue
          reduceProjectedFact(identity, {
            type: 'tool-progress',
            toolCallId: identity.toolCallId,
            toolName: identity.toolName,
            selectedChannel: identity.selectedChannel,
            phase,
            signal: 'terminal',
            elapsedMs: elapsedSinceStart(event, payload, identity),
            timeoutMs: readNonNegativeNumber(payload.timeoutMs) ?? undefined,
            occurredAt: event.occurredAt,
            eventId: event.eventId,
            errorCode,
            errorMessage,
          }, {
            confirmSelectedChannel: identity.selectedChannelConfirmed,
          })
        }
      }
      turnTerminal = true
      return projected
    }

    const payload = readRecord(event.payload)
    if (!payload)
      return projected

    if (
      event.eventType === 'model.tool_call.proposed'
      || event.eventType === 'action.started'
    ) {
      const identity = resolveToolIdentity(event, payload, actions)
      if (!identity)
        return projected
      const hasTypedChannel = normalizeAlicizationExecutionChannel(
        payload.selectedChannel,
      ) !== null
      if (!reducer.getCard(identity.toolCallId) || hasTypedChannel) {
        const fact = {
          type: 'tool-call',
          toolCallId: identity.toolCallId,
          toolName: identity.toolName,
          selectedChannel: identity.selectedChannel,
          ...(Object.prototype.hasOwnProperty.call(payload, 'arguments')
            ? { arguments: payload.arguments }
            : {}),
        } as AlicizationRuntimeToolProjectionFact
        reduceProjectedFact(identity, fact, {
          confirmSelectedChannel: identity.selectedChannelConfirmed,
        })
      }
      else if (identity.driftedToolCallId) {
        traceToolCallIdDrift(reducer, identity, {
          type: 'tool-call',
          toolCallId: identity.toolCallId,
          toolName: identity.toolName,
          selectedChannel: identity.selectedChannel,
        })
      }
      return projected
    }

    if (
      event.eventType === 'action.progress'
      || event.eventType === 'action.output.delta'
    ) {
      const identity = resolveToolIdentity(event, payload, actions)
      if (!identity)
        return projected
      if (!reducer.getCard(identity.toolCallId)) {
        reducer.reduce({
          type: 'tool-call',
          toolCallId: identity.toolCallId,
          toolName: identity.toolName,
          selectedChannel: identity.selectedChannel,
        }, {
          confirmSelectedChannel: identity.selectedChannelConfirmed,
        })
      }
      const fact = {
        type: 'tool-progress',
        toolCallId: identity.toolCallId,
        toolName: identity.toolName,
        selectedChannel: identity.selectedChannel,
        phase: progressPhase(payload.phase),
        elapsedMs: elapsedSinceStart(event, payload, identity),
        timeoutMs: readNonNegativeNumber(payload.timeoutMs) ?? undefined,
        errorCode: readText(payload.errorCode) || undefined,
        errorMessage: readText(payload.errorMessage) || undefined,
        ...(progressSignal(payload.signal) ? { signal: progressSignal(payload.signal) } : {}),
        occurredAt: readNonNegativeNumber(payload.occurredAt) ?? event.occurredAt,
        eventId: readText(payload.eventId) || event.eventId,
        threadId: readText(payload.threadId) || undefined,
        adapterEventType: readText(payload.adapterEventType) || undefined,
        itemType: readText(payload.itemType) || undefined,
        summary: readText(payload.summary) || undefined,
        command: readText(payload.command) || undefined,
        commandStatus: readText(payload.commandStatus) || undefined,
        commandExitCode: readNonNegativeNumber(payload.commandExitCode) ?? undefined,
        outputPreview: outputPreview(payload),
      } as AlicizationRuntimeToolProjectionFact
      reduceProjectedFact(identity, fact, {
        confirmSelectedChannel: identity.selectedChannelConfirmed,
      })
      return projected
    }

    if (event.eventType === 'action.observation' && payload.terminal === true) {
      const identity = resolveToolIdentity(event, payload, actions)
      if (!identity)
        return projected
      if (!reducer.getCard(identity.toolCallId)) {
        reducer.reduce({
          type: 'tool-call',
          toolCallId: identity.toolCallId,
          toolName: identity.toolName,
          selectedChannel: identity.selectedChannel,
        }, {
          confirmSelectedChannel: identity.selectedChannelConfirmed,
        })
      }

      const output = Object.prototype.hasOwnProperty.call(payload, 'output')
        ? payload.output
        : undefined
      const phase = observationPhase(payload.outcome, output, payload)
      const errorCode = readText(payload.errorCode)
      const errorMessage = readText(payload.errorMessage) || readText(payload.error)
      const resultFact = {
        type: 'tool-result',
        toolCallId: identity.toolCallId,
        toolName: identity.toolName,
        selectedChannel: identity.selectedChannel,
        phase,
        result: output,
      } as AlicizationRuntimeToolProjectionFact
      if (errorCode || errorMessage) {
        reduceProjectedFact(identity, {
          type: 'tool-progress',
          toolCallId: identity.toolCallId,
          toolName: identity.toolName,
          selectedChannel: identity.selectedChannel,
          phase,
          signal: 'terminal',
          elapsedMs: elapsedSinceStart(event, payload, identity),
          occurredAt: event.occurredAt,
          eventId: event.eventId,
          errorCode: errorCode || undefined,
          errorMessage: errorMessage || undefined,
        }, {
          confirmSelectedChannel: identity.selectedChannelConfirmed,
        })
      }
      reduceProjectedFact(identity, resultFact, {
        confirmSelectedChannel: identity.selectedChannelConfirmed,
      })
      return projected
    }

    const phase = terminalEventPhase(event.eventType)
    if (phase) {
      const identity = resolveToolIdentity(event, payload, actions)
      if (!identity)
        return projected
      if (!reducer.getCard(identity.toolCallId)) {
        reducer.reduce({
          type: 'tool-call',
          toolCallId: identity.toolCallId,
          toolName: identity.toolName,
          selectedChannel: identity.selectedChannel,
        }, {
          confirmSelectedChannel: identity.selectedChannelConfirmed,
        })
      }

      const fact = {
        type: 'tool-progress',
        toolCallId: identity.toolCallId,
        toolName: identity.toolName,
        selectedChannel: identity.selectedChannel,
        phase,
        signal: 'terminal',
        elapsedMs: elapsedSinceStart(event, payload, identity),
        occurredAt: event.occurredAt,
        eventId: event.eventId,
        errorCode: readText(payload.errorCode) || undefined,
        errorMessage: readText(payload.errorMessage)
          || readText(payload.error)
          || readText(payload.reason)
          || undefined,
      } as AlicizationRuntimeToolProjectionFact
      reduceProjectedFact(identity, fact, {
        confirmSelectedChannel: identity.selectedChannelConfirmed,
      })
    }

    return projected
  }

  return {
    project,
    snapshot,
  }
}

export function projectAlicizationRuntimeToolEvents(
  events: AlicizationRuntimeEventEnvelope[],
): AlicizationReplayedToolProjection {
  const projector = createAlicizationRuntimeToolEventProjector()
  const orderedEvents = events
    .map((event, index) => ({ event, index }))
    .sort((left, right) =>
      left.event.sequence - right.event.sequence || left.index - right.index)
  for (const { event } of orderedEvents)
    projector.project(event)
  return projector.snapshot()
}
