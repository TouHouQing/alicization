import type { AlicizationBridgeChatStreamEvent } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartResult,
  AlicizationChatStreamChunkEvent,
} from '../shared/eventa'

import {
  containsAlicizationFixedTemplateResidue,
  formatAlicizationProjectStateAwarenessFields,
  normalizeAlicizationDigitalLifeEnvelope,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'
import {
  normalizeStructuredPreDialogueAwarenessPayload,
  normalizeStructuredPreDialogueClosurePayload,
  normalizeStructuredProjectStatePayload,
} from '@proj-alicization/stage-ui/composables/alicization-structured-output'

type AlicizationBridgeMetaEvent = Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }>
type AlicizationBridgePreDialogueClosure = NonNullable<AlicizationBridgeMetaEvent['preDialogueClosure']>
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

function buildBridgeLatestLandedProgressReason(latestLandedProgress: string | null | undefined) {
  const normalized = latestLandedProgress?.trim()
  if (!normalized || containsAlicizationFixedTemplateResidue(normalized))
    return null

  return `kind=latest_landed_progress; value=${normalized}`
}

function buildBridgeNextClosureTargetReason(nextClosureTarget: string | null | undefined) {
  const normalized = nextClosureTarget?.trim()
  if (!normalized || containsAlicizationFixedTemplateResidue(normalized))
    return null

  return `kind=next_closure_target; value=${normalized}`
}

function isBridgeAwarenessReason(reason: string | null): reason is string {
  return Boolean(reason && !containsAlicizationFixedTemplateResidue(reason))
}

function sanitizeBridgeAwarenessLine(raw: string | null | undefined) {
  const sanitized = sanitizeBridgeMetadataText(raw)
  if (!sanitized)
    return null
  const hasStructuredProgressFact = /(?:^|\|\s*)(?:landed|open|next|emotional_closure|status)=/iu.test(sanitized)
  if (/^(?:summary|identity|phase)=/iu.test(sanitized) && !hasStructuredProgressFact)
    return null
  return sanitized
}

function sanitizeBridgeMetadataText(raw: string | null | undefined) {
  const sanitized = sanitizeAlicizationProviderFacingText(raw, 420, '') || null
  if (!sanitized || containsAlicizationFixedTemplateResidue(sanitized))
    return null
  if (/\blocal_desktop_life_loop\b|\bphase1_local_digital_life\b|content=excluded|visibility=internal[-_]structured/iu.test(sanitized))
    return null
  if (/^remember\s*:|\b(?:should|must)\s+remember\b/iu.test(sanitized))
    return null
  return sanitized
}

function sanitizeBridgeClosureMetadataText(raw: string | null | undefined) {
  return sanitizeBridgeMetadataText(raw)
}

function normalizeBridgeReasonPreviewLine(raw: string | null | undefined) {
  const sanitized = sanitizeBridgeMetadataText(raw)
  if (!sanitized)
    return null

  const latestPrefix = 'Latest landed progress still holds at'
  if (sanitized.startsWith(latestPrefix)) {
    const value = sanitized.slice(latestPrefix.length).trim().replace(/[.。]$/u, '')
    return buildBridgeLatestLandedProgressReason(value)
  }

  const nextPrefix = 'Next closure target is still'
  if (sanitized.startsWith(nextPrefix)) {
    const value = sanitized.slice(nextPrefix.length).trim().replace(/[.。]$/u, '')
    return buildBridgeNextClosureTargetReason(value)
  }

  return sanitized
}

function sanitizeBridgeReasonPreview(reasons: string[] | null | undefined) {
  return (reasons ?? [])
    .map(reason => normalizeBridgeReasonPreviewLine(reason))
    .filter(isBridgeAwarenessReason)
}

function sanitizeBridgeIdentityText(raw: string | null | undefined) {
  const sanitized = sanitizeBridgeMetadataText(raw)
  if (!sanitized)
    return null
  return /\blocal-first digital life project\b|\bone continuous "?her"?\b|\blocal_desktop_life_loop\b/iu.test(sanitized)
    ? null
    : sanitized
}

function sanitizeBridgePhaseText(raw: string | null | undefined) {
  const sanitized = sanitizeBridgeMetadataText(raw)
  if (!sanitized)
    return null
  return /\bphase\s*1\s*:\s*local digital life\b|\blocal digital life\b|\blocal_desktop_life_loop\b/iu.test(sanitized)
    ? null
    : sanitized
}

function sanitizeBridgeProjectState<T extends Record<string, any> | null>(projectState: T): T {
  if (!projectState)
    return projectState

  return {
    ...projectState,
    identity: sanitizeBridgeIdentityText(projectState.identity),
    currentPhase: sanitizeBridgePhaseText(projectState.currentPhase),
    latestLandedProgress: sanitizeBridgeMetadataText(projectState.latestLandedProgress),
    latestProgress: sanitizeBridgeMetadataText(projectState.latestProgress),
    landedProgressSummary: sanitizeBridgeMetadataText(projectState.landedProgressSummary),
    preDialogueAwarenessLine: sanitizeBridgeMetadataText(projectState.preDialogueAwarenessLine),
    awarenessLine: sanitizeBridgeMetadataText(projectState.awarenessLine),
    preDialogueAwarenessSummary: sanitizeBridgeMetadataText(projectState.preDialogueAwarenessSummary),
    preflightSummary: sanitizeBridgeMetadataText(projectState.preflightSummary),
    memoryClosureSummary: sanitizeBridgeMetadataText(projectState.memoryClosureSummary),
    companionHeadlineLine: sanitizeBridgeMetadataText(projectState.companionHeadlineLine),
    companionBriefingLine: sanitizeBridgeMetadataText(projectState.companionBriefingLine),
    companionNextClosureLine: sanitizeBridgeMetadataText(projectState.companionNextClosureLine),
    primaryOpenLoop: sanitizeBridgeMetadataText(projectState.primaryOpenLoop),
    nextClosureTarget: sanitizeBridgeMetadataText(projectState.nextClosureTarget),
    continuitySummary: sanitizeBridgeMetadataText(projectState.continuitySummary),
    sameHerSelfLine: sanitizeBridgeMetadataText(projectState.sameHerSelfLine),
    sameHerHoldDetail: sanitizeBridgeMetadataText(projectState.sameHerHoldDetail),
    sameHerDriftRisk: sanitizeBridgeMetadataText(projectState.sameHerDriftRisk),
    proactiveSameHerGap: sanitizeBridgeMetadataText(projectState.proactiveSameHerGap),
    continuityCue: sanitizeBridgeMetadataText(projectState.continuityCue),
    emotionalClosureCue: sanitizeBridgeMetadataText(projectState.emotionalClosureCue),
  } as T
}

function sanitizeBridgePreDialogueClosure(
  closure: ReturnType<typeof normalizeStructuredPreDialogueClosurePayload> | null,
): AlicizationBridgePreDialogueClosure | null {
  if (!closure)
    return null

  return {
    ...closure,
    summaryLine: sanitizeBridgeClosureMetadataText(closure.summaryLine),
    companionHeadlineLine: sanitizeBridgeClosureMetadataText(closure.companionHeadlineLine),
    companionBriefingLine: sanitizeBridgeClosureMetadataText(closure.companionBriefingLine),
    companionNextClosureLine: sanitizeBridgeClosureMetadataText(closure.companionNextClosureLine),
    emotionalClosureCue: sanitizeBridgeClosureMetadataText(closure.emotionalClosureCue),
    sameHerDriftRiskLine: sanitizeBridgeClosureMetadataText(closure.sameHerDriftRiskLine),
    companionshipReasonLine: sanitizeBridgeClosureMetadataText(closure.companionshipReasonLine),
    briefingLines: Array.isArray(closure.briefingLines)
      ? closure.briefingLines
          .map(line => sanitizeBridgeClosureMetadataText(line))
          .filter((line): line is string => Boolean(line))
      : closure.briefingLines,
    reasons: Array.isArray(closure.reasons)
      ? closure.reasons
          .map(reason => sanitizeBridgeClosureMetadataText(reason))
          .filter((reason): reason is string => Boolean(reason))
      : closure.reasons,
  } as AlicizationBridgePreDialogueClosure
}

function sanitizeBridgeMetadataRecord<T extends Record<string, any>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (typeof value === 'string')
        return [key, sanitizeBridgeMetadataText(value)]
      if (Array.isArray(value)) {
        return [
          key,
          value
            .map(item => typeof item === 'string' ? sanitizeBridgeMetadataText(item) : item)
            .filter(item => item != null),
        ]
      }
      return [key, value]
    }),
  ) as T
}

function sanitizeBridgeRuntimeDigest(
  runtimeDigest: AlicizationChatMetaEvent['runtimeDigest'] | null | undefined,
): AlicizationBridgeRuntimeDigest | null {
  if (!runtimeDigest)
    return null

  const currentConsciousFrame = runtimeDigest.currentConsciousFrame
    && typeof runtimeDigest.currentConsciousFrame === 'object'
    && !Array.isArray(runtimeDigest.currentConsciousFrame)
    ? runtimeDigest.currentConsciousFrame as Record<string, any>
    : null

  return {
    ...runtimeDigest,
    summary: sanitizeBridgeMetadataText(runtimeDigest.summary),
    projectState: sanitizeBridgeProjectState(
      runtimeDigest.projectState
      && typeof runtimeDigest.projectState === 'object'
      && !Array.isArray(runtimeDigest.projectState)
        ? runtimeDigest.projectState
        : null,
    ),
    currentConsciousFrame: currentConsciousFrame
      ? {
          ...sanitizeBridgeMetadataRecord(currentConsciousFrame),
          projectState: sanitizeBridgeProjectState(
            currentConsciousFrame.projectState
            && typeof currentConsciousFrame.projectState === 'object'
            && !Array.isArray(currentConsciousFrame.projectState)
              ? currentConsciousFrame.projectState
              : null,
          ),
        }
      : runtimeDigest.currentConsciousFrame,
  } as AlicizationBridgeRuntimeDigest
}

function buildBridgeProjectAwarenessLine(input: {
  identity?: string | null
  currentPhase?: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
  emotionalClosureCue?: string | null
}) {
  return formatAlicizationProjectStateAwarenessFields({
    identity: input.identity,
    currentPhase: input.currentPhase,
    latestLandedProgress: input.latestLandedProgress,
    primaryOpenLoop: input.primaryOpenLoop,
    nextClosureTarget: input.nextClosureTarget,
    continuityAnchor: input.sameHerSelfLine,
    emotionalClosureCue: input.emotionalClosureCue,
    maxChars: 320,
  }) || null
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
  const bridgedProjectState = sanitizeBridgeProjectState(normalizedProjectState
    && !normalizedProjectState.sameHerSelfLine
    && normalizedProjectState.identity
    && normalizedProjectState.currentPhase
    && normalizedProjectState.nextClosureTarget
    ? {
        ...normalizedProjectState,
        sameHerSelfLine: null,
      }
    : normalizedProjectState ?? null)
  const normalizedPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(
    (payload.preDialogueAwareness ?? null) as Record<string, unknown> | null,
  )
  const normalizedPreDialogueClosure = normalizeStructuredPreDialogueClosurePayload(
    (payload.preDialogueClosure ?? null) as Record<string, unknown> | null,
  )
  const bridgedPreDialogueClosure = sanitizeBridgePreDialogueClosure(normalizedPreDialogueClosure ?? null)
  const bridgedExplicitPreDialogueAwareness = normalizedPreDialogueAwareness
    ? {
        ...normalizedPreDialogueAwareness,
        summaryLine: sanitizeBridgeMetadataText(normalizedPreDialogueAwareness.summaryLine),
        companionHeadlineLine: sanitizeBridgeMetadataText(normalizedPreDialogueAwareness.companionHeadlineLine),
        companionBriefingLine: sanitizeBridgeMetadataText(normalizedPreDialogueAwareness.companionBriefingLine),
        companionNextClosureLine: sanitizeBridgeMetadataText(normalizedPreDialogueAwareness.companionNextClosureLine),
        awarenessLine: sanitizeBridgeAwarenessLine(resolveAlicizationProjectPreDialogueAwarenessLine({
          runtimeProjectState: {
            identity: bridgedProjectState?.identity ?? null,
            currentPhase: bridgedProjectState?.currentPhase ?? null,
            preDialogueAwarenessLine: normalizedPreDialogueAwareness.awarenessLine,
            awarenessLine: normalizedPreDialogueAwareness.awarenessLine,
            companionHeadlineLine: normalizedPreDialogueAwareness.companionHeadlineLine,
            companionBriefingLine:
              normalizedPreDialogueAwareness.companionBriefingLine
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
              ?? bridgedPreDialogueClosure?.emotionalClosureCue
              ?? bridgedProjectState?.emotionalClosureCue
              ?? null,
            sameHerSelfLine: bridgedProjectState?.sameHerSelfLine ?? null,
          },
          fallbackProjectState: {
            identity: bridgedProjectState?.identity ?? null,
            currentPhase: bridgedProjectState?.currentPhase ?? null,
            companionBriefingLine:
              normalizedPreDialogueAwareness.companionBriefingLine
              ?? null,
            latestLandedProgress: bridgedProjectState?.latestLandedProgress ?? null,
            primaryOpenLoop: bridgedProjectState?.primaryOpenLoop ?? null,
            nextClosureTarget:
              bridgedProjectState?.nextClosureTarget
              ?? normalizedPreDialogueAwareness.companionNextClosureLine
              ?? null,
            emotionalClosureSummary:
              normalizedPreDialogueAwareness.emotionalClosureCue
              ?? bridgedPreDialogueClosure?.emotionalClosureCue
              ?? bridgedProjectState?.emotionalClosureCue
              ?? null,
            sameHerSelfLine: bridgedProjectState?.sameHerSelfLine ?? null,
          },
        }) || normalizedPreDialogueAwareness.awarenessLine),
        emotionalClosureCue: sanitizeBridgeMetadataText(normalizedPreDialogueAwareness.emotionalClosureCue),
        reasonPreview: sanitizeBridgeReasonPreview(normalizedPreDialogueAwareness.reasonPreview),
      }
    : null
  const bridgedPreDialogueAwareness = bridgedExplicitPreDialogueAwareness
    ?? (
      bridgedProjectState
      && (
        bridgedProjectState.identity
        || bridgedProjectState.currentPhase
        || bridgedProjectState.latestLandedProgress
        || bridgedProjectState.primaryOpenLoop
        || bridgedProjectState.nextClosureTarget
        || bridgedProjectState.emotionalClosureCue
      )
        ? {
            status: 'grounded' as const,
            summaryLine: bridgedProjectState.latestLandedProgress ?? null,
            companionHeadlineLine: null,
            companionBriefingLine: null,
            companionNextClosureLine: bridgedProjectState.nextClosureTarget,
            awarenessLine: sanitizeBridgeAwarenessLine(buildBridgeProjectAwarenessLine({
              identity: bridgedProjectState.identity,
              currentPhase: bridgedProjectState.currentPhase,
              latestLandedProgress: bridgedProjectState.latestLandedProgress,
              primaryOpenLoop: bridgedProjectState.primaryOpenLoop,
              nextClosureTarget: bridgedProjectState.nextClosureTarget,
              sameHerSelfLine: bridgedProjectState.sameHerSelfLine,
              emotionalClosureCue: bridgedProjectState.emotionalClosureCue,
            })),
            emotionalClosureCue:
              bridgedProjectState.emotionalClosureCue
              ?? bridgedPreDialogueClosure?.emotionalClosureCue
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
    preDialogueClosure: bridgedPreDialogueClosure ?? null,
    embodiment: payload.embodiment ?? null,
    embodimentScript: payload.embodimentScript ?? null,
    speechTimeline: payload.speechTimeline ?? null,
    digitalLife: resolveBridgedChatMetaDigitalLifeAuthority(payload),
    digitalLifeSpine: payload.digitalLifeSpine ?? null,
    runtimeDigest: sanitizeBridgeRuntimeDigest(payload.runtimeDigest),
  }
}

export function bridgeAlicizationChatStartResultToStreamEvent(
  _cardId: string,
  payload: AlicizationChatStartResult,
): Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }> {
  return {
    type: 'meta',
    governance: payload.governance ?? null,
    projectState: null,
    preDialogueAwareness: null,
    preDialogueClosure: null,
    embodiment: payload.embodiment ?? null,
    embodimentScript: payload.embodimentScript ?? null,
    speechTimeline: payload.speechTimeline ?? null,
    digitalLife: resolveBridgedChatMetaDigitalLifeAuthority(payload),
    digitalLifeSpine: payload.digitalLifeSpine ?? null,
    runtimeDigest: sanitizeBridgeRuntimeDigest(payload.runtimeDigest),
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
