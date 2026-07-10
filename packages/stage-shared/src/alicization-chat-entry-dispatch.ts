import type {
  AlicizationEmotionalKernelSnapshot,
  AlicizationRuntimeProjectStateDigest,
} from './alicization-transport-contracts'

import { sanitizeAlicizationProviderFacingText } from './alicization-fixed-template-sanitizer'

export type AlicizationChatEntryOrigin = 'ui-user' | 'tool-output' | 'context-recall' | 'system'

export interface AlicizationChatEntryPreDialogueSendIdentity {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  awarenessLine?: string | null
  emotionalClosureCue?: string | null
  projectState?: AlicizationRuntimeProjectStateDigest | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  reasonPreview: string[]
}

function sanitizeAlicizationChatEntryText(value: string | null | undefined, maxChars = 420) {
  return sanitizeAlicizationProviderFacingText(value, maxChars, '') || null
}

function sanitizeAlicizationChatEntryProjectIdentityText(value: string | null | undefined) {
  return sanitizeAlicizationChatEntryText(value, 220)
}

function sanitizeAlicizationChatEntryProjectPhaseText(value: string | null | undefined) {
  return sanitizeAlicizationChatEntryText(value, 180)
}

function sanitizeAlicizationChatEntryReasonPreview(values: string[] | null | undefined) {
  const result: string[] = []
  for (const value of values ?? []) {
    const sanitized = sanitizeAlicizationChatEntryText(value)
    if (!sanitized || result.includes(sanitized))
      continue

    result.push(sanitized)
  }
  return result
}

function sanitizeAlicizationChatEntryProjectState(
  projectState: AlicizationRuntimeProjectStateDigest | null | undefined,
) {
  if (!projectState)
    return null

  return {
    ...projectState,
    preflightSummary: sanitizeAlicizationChatEntryText(projectState.preflightSummary),
    preDialogueAwarenessLine: sanitizeAlicizationChatEntryText(projectState.preDialogueAwarenessLine),
    preDialogueAwarenessSummary: sanitizeAlicizationChatEntryText(projectState.preDialogueAwarenessSummary),
    continuitySummary: sanitizeAlicizationChatEntryText(projectState.continuitySummary),
    awarenessLine: sanitizeAlicizationChatEntryText(projectState.awarenessLine),
    companionHeadlineLine: sanitizeAlicizationChatEntryText(projectState.companionHeadlineLine),
    companionBriefingLine: sanitizeAlicizationChatEntryText(projectState.companionBriefingLine),
    identity: sanitizeAlicizationChatEntryProjectIdentityText(projectState.identity),
    currentPhase: sanitizeAlicizationChatEntryProjectPhaseText(projectState.currentPhase),
    latestLandedProgress: sanitizeAlicizationChatEntryText(projectState.latestLandedProgress),
    latestProgress: sanitizeAlicizationChatEntryText(projectState.latestProgress),
    landedProgressSummary: sanitizeAlicizationChatEntryText(projectState.landedProgressSummary),
    memoryClosureSummary: sanitizeAlicizationChatEntryText(projectState.memoryClosureSummary),
    primaryOpenLoop: sanitizeAlicizationChatEntryText(projectState.primaryOpenLoop),
    nextClosureTarget: sanitizeAlicizationChatEntryText(projectState.nextClosureTarget),
    sameHerSelfLine: sanitizeAlicizationChatEntryText(projectState.sameHerSelfLine),
    sameHerHoldDetail: sanitizeAlicizationChatEntryText(projectState.sameHerHoldDetail),
    sameHerDriftRisk: sanitizeAlicizationChatEntryText(projectState.sameHerDriftRisk),
    emotionalClosureCue: sanitizeAlicizationChatEntryText(projectState.emotionalClosureCue),
    proactiveSameHerGap: sanitizeAlicizationChatEntryText(projectState.proactiveSameHerGap),
    continuityRestraint: sanitizeAlicizationChatEntryText(projectState.continuityRestraint),
    continuityArcStage: sanitizeAlicizationChatEntryText(projectState.continuityArcStage),
    continuityPreferredTiming: sanitizeAlicizationChatEntryText(projectState.continuityPreferredTiming),
    continuityCadence: sanitizeAlicizationChatEntryText(projectState.continuityCadence),
    continuityCue: sanitizeAlicizationChatEntryText(projectState.continuityCue),
  } satisfies AlicizationRuntimeProjectStateDigest
}

export function sanitizeAlicizationChatEntryPreDialogueSendIdentity(
  identity: AlicizationChatEntryPreDialogueSendIdentity,
): AlicizationChatEntryPreDialogueSendIdentity {
  return {
    ...identity,
    summaryLine: sanitizeAlicizationChatEntryText(identity.summaryLine),
    companionHeadlineLine: sanitizeAlicizationChatEntryText(identity.companionHeadlineLine),
    companionBriefingLine: sanitizeAlicizationChatEntryText(identity.companionBriefingLine),
    companionNextClosureLine: sanitizeAlicizationChatEntryText(identity.companionNextClosureLine),
    awarenessLine: sanitizeAlicizationChatEntryText(identity.awarenessLine),
    emotionalClosureCue: sanitizeAlicizationChatEntryText(identity.emotionalClosureCue),
    projectState: sanitizeAlicizationChatEntryProjectState(identity.projectState),
    reasonPreview: sanitizeAlicizationChatEntryReasonPreview(identity.reasonPreview),
  }
}

function hasNonEmptyAlicizationChatEntryText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasAlicizationChatEntryProjectStateCarry(projectState: unknown) {
  if (!projectState || typeof projectState !== 'object' || Array.isArray(projectState))
    return false

  const candidate = projectState as Record<string, unknown>
  return [
    candidate.identity,
    candidate.currentPhase,
    candidate.preflightSummary,
    candidate.preDialogueAwarenessLine,
    candidate.preDialogueAwarenessSummary,
    candidate.awarenessLine,
    candidate.companionHeadlineLine,
    candidate.companionBriefingLine,
    candidate.latestLandedProgress,
    candidate.memoryClosureSummary,
    candidate.primaryOpenLoop,
    candidate.nextClosureTarget,
    candidate.sameHerSelfLine,
    candidate.sameHerHoldDetail,
    candidate.sameHerDriftRisk,
    candidate.emotionalClosureCue,
    candidate.emotionalClosureSummary,
    candidate.proactiveSameHerGap,
  ].some(value => hasNonEmptyAlicizationChatEntryText(sanitizeAlicizationChatEntryText(
    typeof value === 'string' ? value : null,
  )))
}

export function hasAlicizationChatEntryPreDialogueSendIdentity(
  identity: AlicizationChatEntryPreDialogueSendIdentity | null | undefined,
) {
  if (!identity || typeof identity !== 'object' || Array.isArray(identity))
    return false

  if (identity.status !== 'grounded' && identity.status !== 'partial' && identity.status !== 'drift')
    return false

  const sanitizedIdentity = sanitizeAlicizationChatEntryPreDialogueSendIdentity(identity)

  return [
    sanitizedIdentity.summaryLine,
    sanitizedIdentity.companionHeadlineLine,
    sanitizedIdentity.companionBriefingLine,
    sanitizedIdentity.companionNextClosureLine,
    sanitizedIdentity.awarenessLine,
    sanitizedIdentity.emotionalClosureCue,
  ].some(hasNonEmptyAlicizationChatEntryText)
  || sanitizedIdentity.reasonPreview.some(hasNonEmptyAlicizationChatEntryText)
  || hasAlicizationChatEntryProjectStateCarry(sanitizedIdentity.projectState)
}

export function assertAlicizationChatEntryPreDialogueSendIdentity(
  identity: AlicizationChatEntryPreDialogueSendIdentity | null | undefined,
  entrypointName: string,
): asserts identity is AlicizationChatEntryPreDialogueSendIdentity {
  if (hasAlicizationChatEntryPreDialogueSendIdentity(identity))
    return

  throw new Error(`[alicization-chat-entry] ${entrypointName} requires explicit preDialogueSendIdentity before voice dialogue dispatch.`)
}

export interface AlicizationChatEntryIngestOptions<
  TPreDialogueSendIdentity = AlicizationChatEntryPreDialogueSendIdentity | null | undefined,
  TChatProvider = unknown,
> {
  providerId: string
  model: string
  chatProvider: TChatProvider
  providerConfig: Record<string, unknown>
  preDialogueSendIdentity?: TPreDialogueSendIdentity
  origin?: AlicizationChatEntryOrigin
}

export type AlicizationChatEntryIngest<
  TPreDialogueSendIdentity = AlicizationChatEntryPreDialogueSendIdentity | null | undefined,
  TChatProvider = unknown,
> = (
  text: string,
  options: AlicizationChatEntryIngestOptions<TPreDialogueSendIdentity, TChatProvider>,
) => Promise<unknown>
