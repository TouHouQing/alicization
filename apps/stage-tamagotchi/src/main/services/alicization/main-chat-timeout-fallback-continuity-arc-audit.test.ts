import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'

describe('main chat timeout fallback continuity-arc isolation', () => {
  it('reports timeout directly without carrying continuity-arc governance into the failure reply', () => {
    const legacyContinuityArc = 'hold-for-opening'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-continuity-arc-isolation',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.67,
        channels: [],
        summary: 'opening_policy=continue_same_her',
        projectState: {
          continuityArcStage: legacyContinuityArc,
          continuityCue: 'relationship_cadence=measured_return',
        },
      } as any,
    })

    const payload = JSON.parse(reply) as Record<string, any>

    expect(payload.reply).toBe('超时了。')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.visibleReplySource).toBe('infrastructure-failure')
    expect(payload.nonHumanAuthoredStatus).toBe('direct-infra-repair:timeout')
    expect(payload.transportFailure).toEqual({
      stage: 'main-gateway-timeout',
      reason: 'main-gateway-timeout-recovery-exhausted',
      turnId: 'turn-timeout-continuity-arc-isolation',
    })
    expect(payload.reasonCodes).toContain('infra-status-only-timeout-fallback')
    expect(payload.projectState).toBeUndefined()
    expect(payload.projectStateAudit).toBeUndefined()
    expect(reply).not.toContain(legacyContinuityArc)
    expect(reply).not.toMatch(/opening_policy|relationship_cadence/iu)
  })
})
