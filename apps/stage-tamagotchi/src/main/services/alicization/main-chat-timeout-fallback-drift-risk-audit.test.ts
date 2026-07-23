import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'

describe('main chat timeout fallback drift-risk isolation', () => {
  it('keeps the provider timeout visible without replaying same-her drift-risk prose', () => {
    const legacyDriftRisk
      = 'If timeout fallback reopens as a generic assistant shell, restore same-her continuity.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-drift-risk-isolation',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.87,
        companionshipPressure: 0.69,
        channels: [],
        summary: 'visibility=redacted_internal',
        projectState: {
          sameHerDriftRisk: legacyDriftRisk,
        },
      } as any,
    })

    const payload = JSON.parse(reply) as Record<string, any>

    expect(payload.reply).toBe('超时了。')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(payload.excludeFromPersonaLearning).toBe(true)
    expect(payload.excludeFromMemoryCondensation).toBe(true)
    expect(payload.transportFailure.stage).toBe('main-gateway-timeout')
    expect(payload.transportFailure.reason).toBe('main-gateway-timeout-recovery-exhausted')
    expect(payload.projectState).toBeUndefined()
    expect(payload.projectStateAudit).toBeUndefined()
    expect(reply).not.toContain(legacyDriftRisk)
    expect(reply).not.toContain('visibility=redacted_internal')
  })
})
