import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'

describe('main chat timeout fallback', () => {
  it('returns a living greeting fallback for simple hello turns', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-hello',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你好' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as {
      reply: string
      governance: {
        answerSubject: string
        screenReferenceMode: string
      }
    }
    expect(reply).toContain('你好')
    expect(reply).not.toContain('provider')
    expect(reply).not.toContain('baseUrl')
    expect(payload.reply).toContain('你好')
    expect(payload.governance.answerSubject).toBe('relationship')
    expect(payload.governance.screenReferenceMode).toBe('avoid')
  })

  it('returns an execution-oriented continuity fallback for execution turns', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-exec',
      actionKind: 'execute',
      messages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
      ] as Message[],
    })

    expect(reply).toContain('执行')
    expect(reply).toContain('用cli帮我查一下桌面有什么文件')
  })

  it('keeps short follow-up turns on the same continuity thread', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-follow-up',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。' },
        { role: 'user', content: '另外还有哪四项？' },
      ] as Message[],
    })

    expect(reply).toContain('桌面')
    expect(reply).not.toContain('继续还是执行下一步')
    expect(reply).not.toContain('旧锚点')
  })

  it('returns a non-repetitive general fallback for regular non-greeting turns', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-general',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '我今天状态有点乱，想先把接下来两小时安排好' },
      ] as Message[],
    })

    expect(reply).toContain('两小时')
    expect(reply).not.toContain('我先守住真实边界')
  })
})
