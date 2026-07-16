import type { AlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

import type { AlicizationMindTurnGovernance } from '../../../../shared/eventa'

import { normalizeAlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

export interface AlicizationMainChatReplyProjectStateAudit {
  sameHerSummary?: string | null
  sameHerHoldDetail?: string | null
  continuityArcStage?: string | null
  continuityCue?: string | null
  sameHerDriftRiskSummary?: string | null
  proactiveSameHerGapSummary?: string | null
  currentPhaseSummary?: string | null
  landedProgressSummary?: string | null
  openClosureSummary?: string | null
  openFocusSummary?: string | null
  nextFocusSummary?: string | null
  nextClosureTargetSummary?: string | null
  continuitySummary?: string | null
  embodimentClosureSummary?: string | null
  preDialogueAwarenessSummary?: string | null
}

export interface AlicizationMainChatReplyResponseSurfaceContract {
  projectContinuity?: {
    currentPhase?: string | null
    latestProgress?: string | null
    primaryOpenLoop?: string | null
    nextClosureTarget?: string | null
    preDialogueAwarenessLine?: string | null
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    emotionalClosureCue?: string | null
    sameHerLineRequired?: boolean
  } | null
}

export interface AlicizationMainChatVisibleReplyClosureSurface {
  projectStateAudit?: AlicizationMainChatReplyProjectStateAudit | null
}

export interface AlicizationMainChatReplyAuthoritySurface {
  replyRealizationMode: 'provider-mind-required' | 'fallback-locally-allowed'
  expectedVisibleReplyAuthority: AlicizationNormalVisibleReplyAuthority
  whyProviderMindRequired: string | null
  projectStateAudit?: AlicizationMainChatReplyProjectStateAudit | null
  responseSurfaceContract?: AlicizationMainChatReplyResponseSurfaceContract | null
  visibleReplyClosure?: AlicizationMainChatVisibleReplyClosureSurface | null
}

export interface AlicizationMainChatReplyExecutionPlanSurface {
  preferredMode: 'provider-stream' | 'provider-one-shot' | 'local-fallback'
  expectedVisibleReplyAuthority: AlicizationNormalVisibleReplyAuthority
  reason: string | null
}

export function resolveAlicizationMainChatNormalVisibleReplyAuthority(
  governance: AlicizationMindTurnGovernance | null,
): AlicizationMainChatReplyAuthoritySurface['expectedVisibleReplyAuthority'] {
  return normalizeAlicizationNormalVisibleReplyAuthority(
    governance?.visibleReplyAuthority ?? null,
    'llm-mind',
  )
}

export function describeAlicizationMainChatProviderMindRequirement(
  _authority: AlicizationMainChatReplyAuthoritySurface['expectedVisibleReplyAuthority'],
) {
  return 'This turn should be fully realized by the provider mind rather than a local deterministic wording layer.'
}
