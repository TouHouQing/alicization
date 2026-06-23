import type {
  AlicizationEmotionalKernelSnapshot,
  AlicizationRuntimeProjectStateDigest,
} from './alicization-transport-contracts'

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
  ].some(hasNonEmptyAlicizationChatEntryText)
}

export function hasAlicizationChatEntryPreDialogueSendIdentity(
  identity: AlicizationChatEntryPreDialogueSendIdentity | null | undefined,
) {
  if (!identity || typeof identity !== 'object' || Array.isArray(identity))
    return false

  if (identity.status !== 'grounded' && identity.status !== 'partial' && identity.status !== 'drift')
    return false

  return [
    identity.summaryLine,
    identity.companionHeadlineLine,
    identity.companionBriefingLine,
    identity.companionNextClosureLine,
    identity.awarenessLine,
    identity.emotionalClosureCue,
  ].some(hasNonEmptyAlicizationChatEntryText)
  || (
    Array.isArray(identity.reasonPreview)
    && identity.reasonPreview.some(hasNonEmptyAlicizationChatEntryText)
  )
  || hasAlicizationChatEntryProjectStateCarry(identity.projectState)
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
