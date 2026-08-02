import type { AlicizationBridgeChatStreamEvent } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import type {
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
