import { describe, expect, it } from 'vitest'

import { resolveAlicizationVisibleReplyGovernanceAuditAuthority } from './governance-audit'

describe('visible reply governance audit authority', () => {
  it('uses explicit LLM authority names instead of assistant-structured', () => {
    expect(resolveAlicizationVisibleReplyGovernanceAuditAuthority({
      shouldOverrideVisibleReply: false,
      governance: { visibleReplyAuthority: 'llm-mind' },
    })).toEqual({
      visibleReplyAuthority: 'llm-mind-structured',
      visibleReplyRealizationAuthority: 'llm-mind',
    })
  })

  it('marks takeover as second-pass rewrite request', () => {
    expect(resolveAlicizationVisibleReplyGovernanceAuditAuthority({
      shouldOverrideVisibleReply: true,
      governance: { visibleReplyAuthority: 'llm-mind' },
    })).toEqual({
      visibleReplyAuthority: 'llm-second-pass-rewrite-request',
      visibleReplyRealizationAuthority: 'llm-second-pass-rewrite',
    })
  })
})
