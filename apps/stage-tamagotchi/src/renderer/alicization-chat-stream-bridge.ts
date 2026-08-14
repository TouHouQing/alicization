import type { AlicizationBridgeChatStreamEvent } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import type {
  AlicizationChatAbortResult,
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartResult,
  AlicizationChatStreamChunkEvent,
  AlicizationVisibleReplyRealizationArtifact,
} from '../shared/eventa'

import {
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationRuntimeDigest,
} from '@proj-alicization/stage-shared'

type AlicizationBridgeMetaEvent = Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }>
type AlicizationBridgeRuntimeDigest = NonNullable<AlicizationBridgeMetaEvent['runtimeDigest']>
type AlicizationBridgeFinishEvent = Extract<AlicizationBridgeChatStreamEvent, { type: 'finish' }>
type AlicizationChatFinishBridgePayload = Omit<
  AlicizationChatFinishEvent,
  'visibleReplyExecution' | 'visibleReplyCritic' | 'visibleReplyClosure'
> & {
  visibleReplyExecution?: AlicizationBridgeFinishEvent['visibleReplyExecution']
  visibleReplyCritic?: AlicizationBridgeFinishEvent['visibleReplyCritic']
  visibleReplyClosure?: AlicizationBridgeFinishEvent['visibleReplyClosure']
}

interface AlicizationChatStreamLifecycleOptions {
  onStreamEvent?: (event: AlicizationBridgeChatStreamEvent) => Promise<void> | void
  onDeliveryError?: (error: unknown, event: AlicizationBridgeChatStreamEvent) => Promise<void> | void
  resolve: () => void
  reject: (error: unknown) => void
}

export function createAlicizationChatStreamLifecycle(
  options: AlicizationChatStreamLifecycleOptions,
) {
  let queueTail = Promise.resolve()
  let firstDeliveryError: unknown
  let observedError: Extract<AlicizationBridgeChatStreamEvent, { type: 'error' }> | null = null
  let terminalScheduled = false

  const enqueue = (event: AlicizationBridgeChatStreamEvent) => {
    queueTail = queueTail.then(async () => {
      try {
        await options.onStreamEvent?.(event)
      }
      catch (error) {
        if (
          event.type === 'tool-call'
          || event.type === 'tool-progress'
          || event.type === 'tool-result'
        ) {
          try {
            await options.onDeliveryError?.(error, event)
          }
          catch {
            // Projection and its audit path are both secondary to the
            // main-owned Provider/tool lifecycle.
          }
          return
        }
        firstDeliveryError ??= error
      }
    })
    return queueTail
  }

  return {
    publish(event: AlicizationBridgeChatStreamEvent) {
      if (terminalScheduled)
        return
      if (
        observedError
        && event.type !== 'error'
        && event.type !== 'finish'
        && (
          event.type !== 'tool-progress'
          || event.projection?.traceOnly !== true
        )
      ) {
        return
      }
      if (event.type === 'error') {
        if (observedError)
          return
        observedError = event
      }
      void enqueue(event)
    },
    resolveAfter(events: AlicizationBridgeChatStreamEvent[]) {
      if (terminalScheduled)
        return
      terminalScheduled = true
      for (const event of events)
        void enqueue(event)
      queueTail = queueTail.then(() => {
        if (firstDeliveryError !== undefined) {
          options.reject(firstDeliveryError)
          return
        }
        if (observedError) {
          options.reject(new Error(String(observedError.error || 'Alicization chat stream failed.')))
          return
        }
        options.resolve()
      })
    },
    rejectAfter(events: AlicizationBridgeChatStreamEvent[], error: unknown) {
      if (terminalScheduled)
        return
      terminalScheduled = true
      for (const event of events)
        void enqueue(event)
      queueTail = queueTail.then(() => {
        options.reject(error)
      })
    },
    hasObservedError() {
      return observedError !== null
    },
    getObservedError() {
      return observedError
    },
    isTerminalScheduled() {
      return terminalScheduled
    },
    async waitForIdle() {
      await queueTail
    },
  }
}

export function createAlicizationChatStartAbortCoordinator(
  invokeAbort: () => Promise<AlicizationChatAbortResult>,
) {
  let abortRequested = false
  let abortAccepted = false
  let lastAbortResult: AlicizationChatAbortResult | null = null
  let inFlight: Promise<AlicizationChatAbortResult> | null = null

  const attemptAbort = () => {
    const attempt = Promise.resolve()
      .then(invokeAbort)
      .then((result) => {
        lastAbortResult = result
        if (result.accepted || result.state === 'aborted')
          abortAccepted = true
        return result
      })
    inFlight = attempt
    void attempt.finally(() => {
      if (inFlight === attempt)
        inFlight = null
    }).catch(() => {})
    return attempt
  }

  return {
    requestAbort() {
      abortRequested = true
      return inFlight ?? attemptAbort()
    },
    async reconcileAcceptedStart() {
      if (!abortRequested || abortAccepted)
        return lastAbortResult
      if (inFlight)
        await inFlight
      if (!abortAccepted)
        return await attemptAbort()
      return lastAbortResult
    },
    getLastAbortResult() {
      return lastAbortResult
    },
    isAbortRequested() {
      return abortRequested
    },
    isAbortAccepted() {
      return abortAccepted
    },
  }
}

export class AlicizationChatAbortUnconfirmedError extends Error {
  readonly code = 'ALICIZATION_CHAT_ABORT_UNCONFIRMED'
  readonly state: AlicizationChatAbortResult['state']
  readonly result: AlicizationChatAbortResult

  constructor(result: AlicizationChatAbortResult) {
    super(`Alicization chat abort was not confirmed by the main runtime (${result.state}).`)
    this.name = 'AlicizationChatAbortUnconfirmedError'
    this.state = result.state
    this.result = result
  }
}

function bridgeSelfContinuityAuthority(
  authority: NonNullable<
    NonNullable<AlicizationChatMetaEvent['runtimeDigest']>['currentConsciousFrame']
  >['selfContinuityAuthority'],
) {
  if (!authority)
    return null

  return {
    sourceTags: [...(authority.sourceTags ?? [])],
    selfLine: authority.selfLine ?? null,
    relationshipLine: authority.relationshipLine ?? null,
    motiveLine: authority.motiveLine ?? null,
    habitLine: authority.habitLine ?? null,
    inwardLine: authority.inwardLine ?? null,
    authoritySummary: authority.authoritySummary ?? null,
    closenessPosture: authority.closenessPosture ?? null,
    currentBodyState: authority.currentBodyState ?? null,
  }
}

function bridgeVisibleReplyRealization(
  realization: AlicizationVisibleReplyRealizationArtifact | null | undefined,
) {
  if (!realization)
    return null

  return {
    version: realization.version ?? null,
    expectedAuthority: realization.expectedAuthority ?? null,
    actualAuthority: realization.actualAuthority ?? null,
    providerMindExecuted: realization.providerMindExecuted ?? null,
    mode: realization.mode ?? null,
    visibleText: realization.visibleText ?? null,
    visibleReplyValidationStatus: realization.visibleReplyValidationStatus ?? null,
    nonHumanAuthoredStatus: realization.nonHumanAuthoredStatus ?? null,
    blockedReasons: [...(realization.blockedReasons ?? [])],
    reason: realization.reason ?? null,
    critic: realization.critic
      ? {
          version: realization.critic.version,
          status: realization.critic.status,
          providerMindRequired: realization.critic.providerMindRequired,
          reasonCodes: [...realization.critic.reasonCodes],
        }
      : null,
    closure: realization.closure
      ? {
          version: realization.closure.version,
          status: realization.closure.status,
          reasonCodes: [...realization.closure.reasonCodes],
          initialCriticStatus: realization.closure.initialCriticStatus,
          finalCriticStatus: realization.closure.finalCriticStatus,
        }
      : null,
  } satisfies AlicizationVisibleReplyRealizationArtifact
}

function bridgeRuntimeDigest(
  runtimeDigest: AlicizationChatMetaEvent['runtimeDigest'] | null | undefined,
): AlicizationBridgeRuntimeDigest | null {
  const normalized = normalizeAlicizationRuntimeDigest(runtimeDigest)
  if (!normalized)
    return null

  const selfContinuityAuthority = bridgeSelfContinuityAuthority(
    runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority,
  )
  const visibleReplyRealization = bridgeVisibleReplyRealization(runtimeDigest?.visibleReplyRealization)

  return {
    ...normalized,
    currentConsciousFrame: normalized.currentConsciousFrame
      ? {
          ...normalized.currentConsciousFrame,
          ...(selfContinuityAuthority ? { selfContinuityAuthority } : {}),
        }
      : null,
    ...(visibleReplyRealization ? { visibleReplyRealization } : {}),
  } as AlicizationBridgeRuntimeDigest
}

function resolveBridgedChatMetaDigitalLifeAuthority(
  payload: Pick<AlicizationChatMetaEvent, 'digitalLife' | 'embodimentScript'>,
) {
  if (payload.digitalLife)
    return payload.digitalLife

  return normalizeAlicizationDigitalLifeEnvelope(payload.embodimentScript?.digitalLife ?? null)
}

export function bridgeAlicizationChatMetaEventToStreamEvent(
  payload: AlicizationChatMetaEvent,
): Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }> {
  return {
    type: 'meta',
    governance: null,
    embodiment: payload.embodiment ?? null,
    embodimentScript: payload.embodimentScript ?? null,
    speechTimeline: payload.speechTimeline ?? null,
    digitalLife: resolveBridgedChatMetaDigitalLifeAuthority(payload),
    digitalLifeSpine: payload.digitalLifeSpine ?? null,
    runtimeDigest: bridgeRuntimeDigest(payload.runtimeDigest),
  }
}

export function bridgeAlicizationChatStartResultToStreamEvent(
  _cardId: string,
  payload: AlicizationChatStartResult,
): Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }> {
  return {
    type: 'meta',
    governance: null,
    embodiment: payload.embodiment ?? null,
    embodimentScript: payload.embodimentScript ?? null,
    speechTimeline: payload.speechTimeline ?? null,
    digitalLife: resolveBridgedChatMetaDigitalLifeAuthority(payload),
    digitalLifeSpine: payload.digitalLifeSpine ?? null,
    runtimeDigest: bridgeRuntimeDigest(payload.runtimeDigest),
  }
}

export function bridgeAlicizationChatChunkEventToStreamEvent(
  payload: AlicizationChatStreamChunkEvent,
): Extract<AlicizationBridgeChatStreamEvent, { type: 'text-delta' }> {
  return {
    type: 'text-delta',
    text: payload.text,
    origin: payload.origin,
    learningPolicy: payload.learningPolicy,
    failureSurface: payload.failureSurface ?? null,
  }
}

export function bridgeAlicizationChatFinishEventToStreamEvent(
  payload: AlicizationChatFinishBridgePayload,
): Extract<AlicizationBridgeChatStreamEvent, { type: 'finish' }> {
  return {
    type: 'finish',
    origin: payload.origin,
    learningPolicy: payload.learningPolicy,
    failureSurface: payload.failureSurface ?? null,
    memoryFailures: payload.memoryFailures ?? [],
    finishReason: payload.finishReason,
    fullText: payload.fullText,
    visibleReplyExecution: payload.visibleReplyExecution ?? null,
    visibleReplyRealization: bridgeVisibleReplyRealization(payload.visibleReplyRealization),
    visibleReplyCritic: payload.visibleReplyCritic ?? null,
    visibleReplyClosure: payload.visibleReplyClosure ?? null,
  }
}

export function bridgeAlicizationChatErrorEventToStreamEvent(
  payload: AlicizationChatErrorEvent,
): Extract<AlicizationBridgeChatStreamEvent, { type: 'error' }> {
  return {
    type: 'error',
    error: payload.error,
    origin: payload.origin,
    learningPolicy: payload.learningPolicy,
    failureSurface: payload.failureSurface ?? null,
  }
}

export function bridgeAlicizationChatAbortedFinishEventToStreamErrorEvent(
  payload: AlicizationChatFinishEvent,
): Extract<AlicizationBridgeChatStreamEvent, { type: 'error' }> {
  const error = payload.error
    || payload.failureSurface?.reply
    || payload.finishReason
    || 'Alicization chat stream aborted.'

  return bridgeAlicizationChatErrorEventToStreamEvent({
    cardId: payload.cardId,
    turnId: payload.turnId,
    error,
    origin: payload.origin,
    learningPolicy: payload.learningPolicy,
    failureSurface: payload.failureSurface ?? null,
  })
}
