import type { AlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

import type { AlicizationMindTurnGovernance } from '../../../../shared/eventa'

import { normalizeAlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

export interface AlicizationMainChatReplyAuthoritySurface {
  replyRealizationMode: 'provider-mind-required' | 'fallback-locally-allowed'
  expectedVisibleReplyAuthority: AlicizationNormalVisibleReplyAuthority
  whyProviderMindRequired: string | null
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
  authority: AlicizationMainChatReplyAuthoritySurface['expectedVisibleReplyAuthority'],
) {
  if (authority === 'llm-second-pass-rewrite')
    return 'This turn may need provider-authored second-pass repair; local deterministic wording is not allowed to realize normal visible dialogue.'
  return 'This turn should be fully realized by the provider mind rather than a local deterministic wording layer.'
}
