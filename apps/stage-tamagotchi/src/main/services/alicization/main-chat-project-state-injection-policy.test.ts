import { describe, expect, it } from 'vitest'

import { shouldIncludeProjectStateProviderContext } from './main-chat-project-state-injection-policy'

describe('main chat project-state injection policy', () => {
  it('keeps ordinary dialogue outside provider project-state context', () => {
    for (const latestUserText of [
      '你好',
      '今天好累',
      '随便聊聊',
      '你是谁',
      '这个事情闭环一下',
      'lipsync 是什么？',
      'same-her 这个词怪怪的',
      '我们沿着同一条线聊聊别的',
      '继续沿着这条数字生命主线',
      '继续，但别把这条数字生命主线又压回一个薄一点的项目提醒',
      'same-her 这条线继续',
      'same-her 相关固定模板清理完成了吗',
      'keep the same living line going',
      'Alicization is a local-first digital life project',
      'WorkingMemory 是什么？',
      'LongTermMemory 这个名字听起来有点硬',
    ]) {
      expect(shouldIncludeProjectStateProviderContext({ latestUserText })).toBe(false)
    }
  })

  it('includes provider project-state context for explicit Chinese digital-life continuity turns', () => {
    for (const latestUserText of [
      '这个本地数字生命人格闭环还差什么',
      '继续沿着同一个数字生命项目，把短期记忆和长期记忆接起来',
      '继续开发人格与自我核心统一',
      '继续把身体线收住',
      'WorkingMemory 和 LongTermMemory 的召回闭环还缺什么',
      'lipsync 和身体线闭环做到哪一步了',
    ]) {
      expect(shouldIncludeProjectStateProviderContext({ latestUserText })).toBe(true)
    }
  })

  it('keeps template-removal corrections outside provider project-state context', () => {
    for (const latestUserText of [
      '别再用 same-her、same living line、Phase 1: Local Digital Life 这些固定模板了。',
      '不要再把同一个她、数字生命主线这些固定话术塞进回复。',
      'remove the local-first digital life project canned slogan from the reply',
    ]) {
      expect(shouldIncludeProjectStateProviderContext({ latestUserText })).toBe(false)
    }
  })

  it('includes provider project-state context for execution and tool status turns', () => {
    expect(shouldIncludeProjectStateProviderContext({
      latestUserText: '那个命令失败了吗',
    })).toBe(true)
    expect(shouldIncludeProjectStateProviderContext({
      latestUserText: '你好',
      executionCapabilityInquiry: {
        active: true,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: false,
        hasCommandLiteral: false,
      },
    })).toBe(true)
  })
})
