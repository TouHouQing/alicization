import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { selectAlicizationExecutionDeliveryReply } from './execution-delivery-surface'
import { buildAlicizationMindTurnContract } from './mind-turn-contract'
import { resolveAlicizationMainChatNormalVisibleReplyAuthority } from './visible-reply/facade'

describe('reply authority invariants', () => {
  it('keeps normal replies on Provider authority without a reply-posture contract', () => {
    expect(resolveAlicizationMainChatNormalVisibleReplyAuthority(null)).toBe('llm-mind')
  })

  it('keeps memory wording out of the Provider authority contract', () => {
    const contract = buildAlicizationMindTurnContract({
      now: 10,
    })

    expect(contract).toEqual({
      version: 'mind-turn-contract-v1',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      updatedAt: 10,
    })
    expect(Object.keys(contract).some(key => /memory|recollection|opening|sentence/iu.test(key))).toBe(false)
  })

  it('keeps execution payoff pending until the Provider settles visible text', () => {
    const pending = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: '',
    })
    const settled = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: 'The runtime line is patched.',
    })

    expect(pending).toEqual({
      status: 'pending-provider-settlement',
      reason: 'missing-provider-reply',
    })
    expect(settled).toEqual({
      status: 'settled',
      source: 'llm',
      visibleReply: 'The runtime line is patched.',
    })
  })

  it('keeps settlement validation-only without a second Provider authorship path', () => {
    const backgroundSource = readFileSync(new URL('./main-chat-background-run.ts', import.meta.url), 'utf8')
    const settlementSource = readFileSync(new URL('./visible-reply/settlement.ts', import.meta.url), 'utf8')

    expect(backgroundSource).not.toContain('forceMustPreserve')
    expect(backgroundSource).not.toContain('rewriteAlicizationVisibleReplySecondPass')
    expect(backgroundSource).not.toContain('rewriteSecondPass')
    expect(settlementSource).not.toContain('forceMustPreserve')
    expect(settlementSource).not.toContain('rewriteSecondPass')
    expect(settlementSource).toContain('provider-settlement-invalid:')
  })
})
