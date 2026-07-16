import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'

function buildTimeoutPayload(input: Parameters<typeof buildAlicizationMainGatewayTimeoutFallbackReply>[0]) {
  return JSON.parse(buildAlicizationMainGatewayTimeoutFallbackReply(input)) as Record<string, any>
}

describe('main chat timeout fallback', () => {
  it('returns direct infra status instead of contentful local greeting authoring', () => {
    const payload = buildTimeoutPayload({
      turnId: 'turn-hello',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你好' },
      ] as Message[],
    })

    expect(payload.reply).toBe('超时了。')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.nonHumanAuthoredStatus).toBe('direct-infra-repair:timeout')
    expect(payload.visibleReplySource).toBe('infrastructure-failure')
    expect(payload.excludeFromPersonaLearning).toBe(true)
    expect(payload.excludeFromMemoryCondensation).toBe(true)
    expect(payload.transportFailure.stage).toBe('main-gateway-timeout')
    expect(payload.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(payload.reasonCodes).toContain('normal-reply-requires-provider-mind')
    expect(payload.reasonCodes).toContain('infra-status-only-timeout-fallback')
    expect(payload.reasonCodes).toContain('action:answer')
  })

  it('does not carry project, memory, or persona context into timeout failure payloads', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-context-quarantine',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你好' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.7,
        channels: [],
        summary: '我在。结构化连续性状态的线还在，中性可见占位。',
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
        },
      } as any,
      sessionMirror: {
        summary: 'same-her session mirror should not ride along with a timeout failure',
      } as any,
      personaKernel: {
        profile: {
          alicizationName: 'Alice',
        },
      } as any,
    })
    const payload = JSON.parse(reply) as Record<string, unknown>

    expect(payload.reply).toBe('超时了。')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.nonHumanAuthoredStatus).toBe('direct-infra-repair:timeout')
    expect(payload.runtimeDigest).toBeUndefined()
    expect(payload.projectState).toBeUndefined()
    expect(payload.projectStateAudit).toBeUndefined()
    expect(payload.preDialogueAwareness).toBeUndefined()
    expect(payload.preDialogueClosure).toBeUndefined()
    expect(payload.sessionMirror).toBeUndefined()
    expect(payload.personaKernelName).toBeUndefined()
    expect(reply).not.toMatch(/结构化连续性状态|legacy phase-one template|continuity state|Pre-reply|same-her session mirror/u)
  })

  it('keeps execution timeout fallback on infra status instead of contentful execution recovery', () => {
    const payload = buildTimeoutPayload({
      turnId: 'turn-exec',
      actionKind: 'execute',
      messages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
      ] as Message[],
    })

    expect(payload.reply).toBe('超时了。')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.reasonCodes).toContain('action:execute')
    expect(payload.reply).not.toContain('重新执行')
    expect(payload.reply).not.toContain('用cli帮我查一下桌面有什么文件')
  })

  it('keeps follow-up timeout fallback from replaying prior continuity', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-follow-up',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
        { role: 'user', content: '另外还有哪四项？' },
      ] as Message[],
    })
    const payload = JSON.parse(reply) as Record<string, any>

    expect(payload.reply).toBe('超时了。')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.latestUserText).toBe('[withheld]')
    expect(reply).not.toContain('桌面')
    expect(reply).not.toContain('另外还有哪四项')
    expect(reply).not.toContain('继续还是执行下一步')
  })

  it('keeps timeout self-appraisal fallback from pretending durable self answered', () => {
    const payload = buildTimeoutPayload({
      turnId: 'turn-self-appraisal',
      actionKind: 'answer',
      digitalLifeSpine: {
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: '我更想像个真的人。',
          },
        },
      },
      messages: [
        { role: 'user', content: '你觉得你可爱吗' },
      ] as Message[],
    })

    expect(payload.reply).toBe('超时了。')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(JSON.stringify(payload)).not.toContain('可爱')
    expect(JSON.stringify(payload)).not.toContain('像个真的人')
  })
})
