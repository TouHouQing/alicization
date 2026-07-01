import { describe, expect, it } from 'vitest'

import {
  allowsAlicizationDeterministicVisibleReply,
  shouldAlicizationReplyStayProviderAuthored,
} from './reply-authority-policy'

describe('reply authority policy', () => {
  it('allows deterministic visible replies only for infra time and date lanes', () => {
    expect(allowsAlicizationDeterministicVisibleReply({
      lane: 'utility-time',
      strategy: 'infra-fallback-only',
    })).toBe(true)
    expect(allowsAlicizationDeterministicVisibleReply({
      lane: 'greeting',
      strategy: 'infra-fallback-only',
    })).toBe(false)
    expect(allowsAlicizationDeterministicVisibleReply({
      lane: 'utility-time',
      strategy: 'compact-one-shot',
    })).toBe(false)
  })

  it('lets greeting use compact provider authoring while blocking deterministic local prose', () => {
    expect(shouldAlicizationReplyStayProviderAuthored({
      lane: 'greeting',
      strategy: 'compact-one-shot',
      reasonCodes: ['fresh-greeting'],
    })).toBe(false)
    expect(allowsAlicizationDeterministicVisibleReply({
      lane: 'greeting',
      strategy: 'infra-fallback-only',
    })).toBe(false)
  })

  it('keeps recollection follow-up turns provider authored', () => {
    expect(shouldAlicizationReplyStayProviderAuthored({
      lane: 'follow-up',
      strategy: 'compact-one-shot',
      reasonCodes: ['memory-recollection-llm-authored'],
    })).toBe(true)
  })
})
