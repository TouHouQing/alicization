import type { AlicizationBridgeChatStreamEvent } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import type { AlicizationChatMetaEvent, AlicizationChatStartResult } from '../shared/eventa'

import {
  normalizeAlicizationDigitalLifeEnvelope,
  resolveAlicizationProjectPreDialogueAwarenessLine,
} from '@proj-alicization/stage-shared'
import {
  normalizeStructuredPreDialogueAwarenessPayload,
  normalizeStructuredPreDialogueClosurePayload,
  normalizeStructuredProjectStatePayload,
} from '@proj-alicization/stage-ui/composables/alicization-structured-output'

const canonicalSameHerSelfLine
  = 'Keep one continuous her explicit from self-understanding into the final host-visible reply.'

function buildBridgeLatestLandedProgressReason(latestLandedProgress: string | null | undefined) {
  const normalized = latestLandedProgress?.trim()
  if (!normalized)
    return null

  return /[.。!！?？]$/u.test(normalized)
    ? `Latest landed progress still holds at ${normalized}`
    : `Latest landed progress still holds at ${normalized}.`
}

function buildBridgeNextClosureTargetReason(nextClosureTarget: string | null | undefined) {
  const normalized = nextClosureTarget?.trim()
  if (!normalized)
    return null

  return /[.。!！?？]$/u.test(normalized)
    ? `Next closure target is still ${normalized}`
    : `Next closure target is still ${normalized}.`
}

function isBridgeAwarenessReason(reason: string | null): reason is string {
  return Boolean(reason)
}

function buildBridgeProjectAwarenessLine(input: {
  identity: string
  currentPhase: string
  primaryOpenLoop: string
  sameHerSelfLine: string
}) {
  const compactIdentity = input.identity
    .replace(/\s+rather than a better chat wrapper\.?$/u, '')
    .replace(/\s+on the host computer\.?$/u, '')
    .trim()
    .slice(0, 120)
  const compactPhase = input.currentPhase.split('. ')[0]?.trim() ?? input.currentPhase.trim()
  const compactOpenLoop = input.primaryOpenLoop
    .split(' so ')[0]
    ?.replace(/[.。!！?？;；:：]+$/u, '')
    .trim()
    .slice(0, 120) ?? input.primaryOpenLoop.trim().slice(0, 120)
  const compactSameHer = input.sameHerSelfLine.trim().slice(0, 110)
  const parts = [
    `Before answering, remember: ${compactIdentity}`,
    `She is still inside ${compactPhase}`,
    `The still-open closure is ${compactOpenLoop}`,
    compactSameHer,
  ]

  return parts.join('. ').replace(/\s+/g, ' ').slice(0, 320).trim() || null
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
  const normalizedProjectState = normalizeStructuredProjectStatePayload(
    (payload.projectState ?? payload.runtimeDigest?.projectState ?? null) as Record<string, unknown> | null,
  )
  const bridgedProjectState = normalizedProjectState
    && !normalizedProjectState.sameHerSelfLine
    && normalizedProjectState.identity
    && normalizedProjectState.currentPhase
    && normalizedProjectState.nextClosureTarget
    ? {
        ...normalizedProjectState,
        sameHerSelfLine: canonicalSameHerSelfLine,
      }
    : normalizedProjectState ?? null
  const normalizedPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(
    (payload.preDialogueAwareness ?? null) as Record<string, unknown> | null,
  )
  const normalizedPreDialogueClosure = normalizeStructuredPreDialogueClosurePayload(
    (payload.preDialogueClosure ?? null) as Record<string, unknown> | null,
  )
  const bridgedExplicitPreDialogueAwareness = normalizedPreDialogueAwareness
    ? {
        ...normalizedPreDialogueAwareness,
        awarenessLine: resolveAlicizationProjectPreDialogueAwarenessLine({
          runtimeProjectState: {
            identity: bridgedProjectState?.identity ?? null,
            currentPhase: bridgedProjectState?.currentPhase ?? null,
            preDialogueAwarenessLine: normalizedPreDialogueAwareness.awarenessLine,
            awarenessLine: normalizedPreDialogueAwareness.awarenessLine,
            companionHeadlineLine: normalizedPreDialogueAwareness.companionHeadlineLine,
            companionBriefingLine:
              normalizedPreDialogueAwareness.companionBriefingLine
              ?? bridgedProjectState?.sameHerSelfLine
              ?? null,
            preDialogueAwarenessSummary: normalizedPreDialogueAwareness.summaryLine,
            latestLandedProgress: bridgedProjectState?.latestLandedProgress ?? null,
            primaryOpenLoop: bridgedProjectState?.primaryOpenLoop ?? null,
            nextClosureTarget:
              bridgedProjectState?.nextClosureTarget
              ?? normalizedPreDialogueAwareness.companionNextClosureLine
              ?? null,
            emotionalClosureSummary:
              normalizedPreDialogueAwareness.emotionalClosureCue
              ?? normalizedPreDialogueClosure?.emotionalClosureCue
              ?? bridgedProjectState?.emotionalClosureCue
              ?? null,
            sameHerSelfLine: bridgedProjectState?.sameHerSelfLine ?? null,
          },
          fallbackProjectState: {
            identity: bridgedProjectState?.identity ?? null,
            currentPhase: bridgedProjectState?.currentPhase ?? null,
            companionBriefingLine:
              bridgedProjectState?.sameHerSelfLine
              ?? normalizedPreDialogueAwareness.companionBriefingLine
              ?? null,
            latestLandedProgress: bridgedProjectState?.latestLandedProgress ?? null,
            primaryOpenLoop: bridgedProjectState?.primaryOpenLoop ?? null,
            nextClosureTarget:
              bridgedProjectState?.nextClosureTarget
              ?? normalizedPreDialogueAwareness.companionNextClosureLine
              ?? null,
            emotionalClosureSummary:
              normalizedPreDialogueAwareness.emotionalClosureCue
              ?? normalizedPreDialogueClosure?.emotionalClosureCue
              ?? bridgedProjectState?.emotionalClosureCue
              ?? null,
            sameHerSelfLine: bridgedProjectState?.sameHerSelfLine ?? null,
          },
        }) || normalizedPreDialogueAwareness.awarenessLine,
      }
    : null
  const bridgedPreDialogueAwareness = bridgedExplicitPreDialogueAwareness
    ?? (
      bridgedProjectState?.identity
      && bridgedProjectState?.currentPhase
      && bridgedProjectState?.primaryOpenLoop
      && bridgedProjectState?.nextClosureTarget
        ? {
            status: 'grounded' as const,
            summaryLine: bridgedProjectState.latestLandedProgress ?? null,
            companionHeadlineLine: null,
            companionBriefingLine: bridgedProjectState.sameHerSelfLine ?? canonicalSameHerSelfLine,
            companionNextClosureLine: bridgedProjectState.nextClosureTarget,
            awarenessLine: buildBridgeProjectAwarenessLine({
              identity: bridgedProjectState.identity,
              currentPhase: bridgedProjectState.currentPhase,
              primaryOpenLoop: bridgedProjectState.primaryOpenLoop,
              sameHerSelfLine: bridgedProjectState.sameHerSelfLine ?? canonicalSameHerSelfLine,
            }),
            emotionalClosureCue:
              bridgedProjectState.emotionalClosureCue
              ?? normalizedPreDialogueClosure?.emotionalClosureCue
              ?? null,
            reasonPreview: [
              buildBridgeLatestLandedProgressReason(bridgedProjectState.latestLandedProgress),
              bridgedProjectState.primaryOpenLoop,
              buildBridgeNextClosureTargetReason(bridgedProjectState.nextClosureTarget),
            ].filter(isBridgeAwarenessReason),
          }
        : null
    )

  return {
    type: 'meta',
    governance: payload.governance ?? null,
    projectState: bridgedProjectState,
    preDialogueAwareness: bridgedPreDialogueAwareness ?? null,
    preDialogueClosure: normalizedPreDialogueClosure ?? null,
    embodiment: payload.embodiment ?? null,
    embodimentScript: payload.embodimentScript ?? null,
    speechTimeline: payload.speechTimeline ?? null,
    digitalLife: resolveBridgedChatMetaDigitalLifeAuthority(payload),
    digitalLifeSpine: payload.digitalLifeSpine ?? null,
    runtimeDigest: payload.runtimeDigest ?? null,
  }
}

export function bridgeAlicizationChatStartResultToStreamEvent(
  cardId: string,
  payload: AlicizationChatStartResult,
): Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }> {
  return bridgeAlicizationChatMetaEventToStreamEvent({
    cardId,
    turnId: payload.turnId,
    governance: payload.governance ?? null,
    projectState: payload.projectState ?? null,
    preDialogueAwareness: payload.preDialogueAwareness ?? null,
    embodiment: payload.embodiment ?? null,
    embodimentScript: payload.embodimentScript ?? null,
    speechTimeline: payload.speechTimeline ?? null,
    digitalLife: payload.digitalLife ?? null,
    digitalLifeSpine: payload.digitalLifeSpine ?? null,
    runtimeDigest: payload.runtimeDigest ?? null,
  })
}
