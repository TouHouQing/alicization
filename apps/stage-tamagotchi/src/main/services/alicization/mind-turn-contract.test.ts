import { describe, expect, it } from 'vitest'

import { buildAlicizationMindTurnContract } from './mind-turn-contract'

const surface = {
  replyRealizationMode: 'provider-mind-required',
  expectedVisibleReplyAuthority: 'llm-mind',
} as const

describe('mind-turn-contract', () => {
  it('carries only Provider execution authority', () => {
    const contract = buildAlicizationMindTurnContract({
      expectedVisibleReplyAuthority: surface.expectedVisibleReplyAuthority,
      now: 20,
    })

    expect(contract).toEqual({
      version: 'mind-turn-contract-v1',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      updatedAt: 20,
    })
  })
})
