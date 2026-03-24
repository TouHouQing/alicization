import { describe, expect, it } from 'vitest'

import { normalizeProactiveMetadata, normalizeStructuredFormat } from './alicization-dialogue-normalization'

describe('alicization dialogue normalization', () => {
  it('preserves supported structured formats instead of collapsing to fallback', () => {
    expect(normalizeStructuredFormat('subconscious-proactive-v1')).toBe('subconscious-proactive-v1')
    expect(normalizeStructuredFormat('subconscious-proactive-llm-v1')).toBe('subconscious-proactive-llm-v1')
    expect(normalizeStructuredFormat('subconscious-reminder-v1')).toBe('subconscious-reminder-v1')
    expect(normalizeStructuredFormat('mind-turn-v1')).toBe('mind-turn-v1')
    expect(normalizeStructuredFormat('epoch1-v1')).toBe('epoch1-v1')
    expect(normalizeStructuredFormat('unknown')).toBe('fallback-v1')
  })

  it('normalizes proactive metadata for renderer/state-ui consumption', () => {
    expect(normalizeProactiveMetadata({
      shouldInterrupt: true,
      confidence: 0.88,
      reasonCodes: ['coding-focus', 'foreground-error'],
      urgency: 'medium',
      style: 'light-nudge',
      cooldownMs: 600_000,
      scenario: 'coding',
      policyVersion: 'epoch3-v1',
      feedbackWindowMs: 120_000,
    })).toEqual({
      shouldInterrupt: true,
      confidence: 0.88,
      reasonCodes: ['coding-focus', 'foreground-error'],
      urgency: 'medium',
      style: 'light-nudge',
      cooldownMs: 600_000,
      scenario: 'coding',
      policyVersion: 'epoch3-v1',
      feedbackWindowMs: 120_000,
    })
  })

  it('drops malformed proactive metadata instead of leaking partial state', () => {
    expect(normalizeProactiveMetadata({
      confidence: 0.5,
      style: 'light-nudge',
      scenario: 'coding',
    })).toBeUndefined()
    expect(normalizeProactiveMetadata({
      shouldInterrupt: true,
      confidence: Number.NaN,
      reasonCodes: [],
      urgency: 'medium',
      style: 'light-nudge',
      cooldownMs: 1,
      scenario: 'coding',
      policyVersion: 'epoch3-v1',
      feedbackWindowMs: 90_000,
    })).toBeUndefined()
  })
})
