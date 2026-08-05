import { describe, expect, it } from 'vitest'

import {
  governedMindFallbackMessageFallbacks,
  translateGovernedMindFallback,
} from './alicization-mind-fallback-messages'

describe('alicization mind failure messages', () => {
  it('contains only transparent mind-repair failure paths', () => {
    for (const localeMessages of Object.values(governedMindFallbackMessageFallbacks)) {
      expect(Object.keys(localeMessages).every(path => path.startsWith('mind-repair.'))).toBe(true)
    }
  })

  it('returns terse Chinese failure messages for the visible chat boundary', () => {
    expect(translateGovernedMindFallback('mind-repair.stream-timeout', undefined, '你好')).toBe('超时了。')
    expect(translateGovernedMindFallback('mind-repair.stream-failure', undefined, '你好')).toBe('回复流失败。')
    expect(translateGovernedMindFallback('mind-repair.provider-config', undefined, '你好')).toBe('提供方或模型配置不完整。')
    expect(translateGovernedMindFallback('mind-repair.recall-failure', undefined, '你好')).toBe('本轮长期记忆召回失败。')
    expect(translateGovernedMindFallback('mind-repair.memory-persistence', undefined, '你好')).toBe('本轮记忆持久化失败。')
  })

  it('keeps English failure messages factual and non-persona', () => {
    const messages = [
      governedMindFallbackMessageFallbacks.en['mind-repair.stream-timeout'],
      governedMindFallbackMessageFallbacks.en['mind-repair.provider-auth'],
      governedMindFallbackMessageFallbacks.en['mind-repair.provider-network'],
      governedMindFallbackMessageFallbacks.en['mind-repair.unsupported-tools'],
      governedMindFallbackMessageFallbacks.en['mind-repair.memory-persistence'],
    ]

    for (const message of messages) {
      expect(message).not.toMatch(/\bI\b|\bwe\b|\bher\b|\bcompanion\b|\bremember\b/iu)
      expect(message).not.toMatch(/\bretry\b|重试/iu)
    }
  })
})
