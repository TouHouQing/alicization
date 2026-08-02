import type { AlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

import type {
  AlicizationMindTurnGovernance,
  AlicizationReplyRealizationMode,
  AlicizationVisibleReplyPlannedExecutionMode,
} from '../../../../shared/eventa'

import { normalizeAlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

export interface AlicizationMainChatReplyAuthoritySurface {
  replyRealizationMode: AlicizationReplyRealizationMode
  expectedVisibleReplyAuthority: AlicizationNormalVisibleReplyAuthority
  whyProviderMindRequired: string | null
}

export interface AlicizationMainChatReplyExecutionPlanSurface {
  preferredMode: AlicizationVisibleReplyPlannedExecutionMode
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
