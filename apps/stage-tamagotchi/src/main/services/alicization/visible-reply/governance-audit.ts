import type { AlicizationMindTurnGovernance } from '../../../../shared/eventa'

export type AlicizationVisibleReplyGovernanceAuditAuthority
  = 'llm-mind-structured'
    | 'llm-second-pass-rewrite-request'

export interface AlicizationVisibleReplyGovernanceAuditAuthorityResolution {
  visibleReplyAuthority: AlicizationVisibleReplyGovernanceAuditAuthority
  visibleReplyRealizationAuthority: 'llm-mind' | 'llm-second-pass-rewrite'
}

export function resolveAlicizationVisibleReplyGovernanceAuditAuthority(input: {
  shouldOverrideVisibleReply: boolean
  governance?: Pick<AlicizationMindTurnGovernance, 'visibleReplyAuthority'> | null
}): AlicizationVisibleReplyGovernanceAuditAuthorityResolution {
  if (input.shouldOverrideVisibleReply) {
    return {
      visibleReplyAuthority: 'llm-second-pass-rewrite-request',
      visibleReplyRealizationAuthority: 'llm-second-pass-rewrite',
    }
  }

  return {
    visibleReplyAuthority: 'llm-mind-structured',
    visibleReplyRealizationAuthority: input.governance?.visibleReplyAuthority ?? 'llm-mind',
  }
}
