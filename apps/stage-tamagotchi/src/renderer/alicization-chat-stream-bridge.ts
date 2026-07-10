import type { AlicizationBridgeChatStreamEvent } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import type { AlicizationChatMetaEvent, AlicizationChatStartResult } from '../shared/eventa'

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

const canonicalSameHerSelfLine
  = 'content=excluded; reason=continuity-residue; visibility=internal-structured'

const bridgeFixedTemplateWithheldLine
  = 'content=excluded; reason=continuity-residue; visibility=internal-structured'

function buildBridgeLatestLandedProgressReason(latestLandedProgress: string | null | undefined) {
  const normalized = latestLandedProgress?.trim()
  if (!normalized || normalized === bridgeFixedTemplateWithheldLine)
    return null

  return `kind=latest_landed_progress; value=${normalized}`
}

function buildBridgeNextClosureTargetReason(nextClosureTarget: string | null | undefined) {
  const normalized = nextClosureTarget?.trim()
  if (!normalized || normalized === bridgeFixedTemplateWithheldLine)
    return null

  return `kind=next_closure_target; value=${normalized}`
}

function isBridgeAwarenessReason(reason: string | null): reason is string {
  return Boolean(reason && reason !== bridgeFixedTemplateWithheldLine)
}

function sanitizeBridgeAwarenessLine(raw: string | null | undefined) {
  const normalized = raw?.trim().replace(/\s+/g, ' ').slice(0, 420).trim() || ''
  if (!normalized)
    return null
  if (containsAlicizationFixedTemplateResidue(normalized))
    return bridgeFixedTemplateWithheldLine
  return normalized
}

function sanitizeBridgeMetadataText(raw: string | null | undefined) {
  return sanitizeAlicizationProviderFacingText(raw, 420, bridgeFixedTemplateWithheldLine) || null
}

function sanitizeBridgeClosureMetadataText(raw: string | null | undefined) {
  const sanitized = sanitizeBridgeMetadataText(raw)
  return sanitized && sanitized !== bridgeFixedTemplateWithheldLine ? sanitized : null
}

function normalizeBridgeReasonPreviewLine(raw: string | null | undefined) {
  const sanitized = sanitizeBridgeMetadataText(raw)
  if (!sanitized || sanitized === bridgeFixedTemplateWithheldLine)
    return null

  const latestMatch = sanitized.match(/^Latest landed progress still holds at\s+(.+?)[.。]?$/iu)
  if (latestMatch)
    return buildBridgeLatestLandedProgressReason(latestMatch[1])

  const nextMatch = sanitized.match(/^Next closure target is still\s+(.+?)[.。]?$/iu)
  if (nextMatch)
    return buildBridgeNextClosureTargetReason(nextMatch[1])

  return sanitized
}

function sanitizeBridgeReasonPreview(reasons: string[] | null | undefined) {
  return (reasons ?? [])
    .map(reason => normalizeBridgeReasonPreviewLine(reason))
    .filter((reason): reason is string => Boolean(reason) && reason !== bridgeFixedTemplateWithheldLine)
}

function sanitizeBridgeIdentityText(raw: string | null | undefined) {
  const sanitized = sanitizeBridgeMetadataText(raw)
  if (!sanitized)
    return null
  return sanitized === bridgeFixedTemplateWithheldLine
    || /\blocal-first digital life project\b|\bone continuous "?her"?\b/iu.test(sanitized)
    ? 'local_desktop_life_loop'
    : sanitized
}

function sanitizeBridgePhaseText(raw: string | null | undefined) {
  const sanitized = sanitizeBridgeMetadataText(raw)
  if (!sanitized)
    return null
  return sanitized === bridgeFixedTemplateWithheldLine
    || /\bphase\s*1\s*:\s*local digital life\b|\blocal digital life\b/iu.test(sanitized)
    ? 'local_desktop_life_loop'
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

function sanitizeBridgePreDialogueClosure<T extends Record<string, any> | null>(closure: T): T {
  if (!closure)
    return closure

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
  } as T
}

function sanitizeBridgeRuntimeDigest<T extends Record<string, any> | null>(runtimeDigest: T): T {
  if (!runtimeDigest)
    return runtimeDigest

  const currentConsciousFrame = runtimeDigest.currentConsciousFrame
    && typeof runtimeDigest.currentConsciousFrame === 'object'
    && !Array.isArray(runtimeDigest.currentConsciousFrame)
    ? runtimeDigest.currentConsciousFrame as Record<string, any>
    : null

  return {
    ...runtimeDigest,
    summary: sanitizeBridgeMetadataText(runtimeDigest.summary) ?? runtimeDigest.summary,
    projectState: sanitizeBridgeProjectState(
      runtimeDigest.projectState
      && typeof runtimeDigest.projectState === 'object'
      && !Array.isArray(runtimeDigest.projectState)
        ? runtimeDigest.projectState
        : null,
    ),
    currentConsciousFrame: currentConsciousFrame
      ? {
          ...currentConsciousFrame,
          projectState: sanitizeBridgeProjectState(
            currentConsciousFrame.projectState
            && typeof currentConsciousFrame.projectState === 'object'
            && !Array.isArray(currentConsciousFrame.projectState)
              ? currentConsciousFrame.projectState
              : null,
          ),
        }
      : runtimeDigest.currentConsciousFrame,
  } as T
}

function buildBridgeProjectAwarenessLine(input: {
  identity: string
  currentPhase: string
  primaryOpenLoop: string
  sameHerSelfLine: string
}) {
  return formatAlicizationProjectStateAwarenessFields({
    identity: input.identity,
    currentPhase: input.currentPhase,
    primaryOpenLoop: input.primaryOpenLoop,
    continuityAnchor: input.sameHerSelfLine,
    visibility: 'internal-structured',
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
        sameHerSelfLine: canonicalSameHerSelfLine,
      }
    : normalizedProjectState ?? null)
  const normalizedPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(
    (payload.preDialogueAwareness ?? null) as Record<string, unknown> | null,
  )
  const normalizedPreDialogueClosure = normalizeStructuredPreDialogueClosurePayload(
    (payload.preDialogueClosure ?? null) as Record<string, unknown> | null,
  )
  const bridgedPreDialogueClosure = sanitizeBridgePreDialogueClosure(normalizedPreDialogueClosure)
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
      bridgedProjectState?.identity
      && bridgedProjectState?.currentPhase
      && bridgedProjectState?.primaryOpenLoop
      && bridgedProjectState?.nextClosureTarget
        ? {
            status: 'grounded' as const,
            summaryLine: bridgedProjectState.latestLandedProgress ?? null,
            companionHeadlineLine: null,
            companionBriefingLine: null,
            companionNextClosureLine: bridgedProjectState.nextClosureTarget,
            awarenessLine: sanitizeBridgeAwarenessLine(buildBridgeProjectAwarenessLine({
              identity: bridgedProjectState.identity,
              currentPhase: bridgedProjectState.currentPhase,
              primaryOpenLoop: bridgedProjectState.primaryOpenLoop,
              sameHerSelfLine: bridgedProjectState.sameHerSelfLine ?? canonicalSameHerSelfLine,
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
    runtimeDigest: sanitizeBridgeRuntimeDigest((payload.runtimeDigest ?? null) as Record<string, any> | null),
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
