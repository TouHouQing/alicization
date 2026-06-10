import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'

describe('main chat timeout fallback drift-risk audit', () => {
  it('keeps same-her drift risk explicit in timeout fallback project-state audit continuity when drift risk is the only surviving anti-shell authority', () => {
    const driftRisk
      = 'If timeout fallback reopens as a generic assistant shell or project-summary voice, treat that as unfinished same-her drift instead of closure.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-drift-risk-audit-only',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底别把 same-her drift risk 再压回 generic shell。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.87,
        companionshipPressure: 0.69,
        channels: [],
        summary: 'timeout fallback should keep drift-risk-only anti-shell authority explicit',
        projectState: {
          identity: '',
          currentPhase: '',
          preflightSummary: '',
          preDialogueAwarenessLine: '',
          latestLandedProgress: '',
          primaryOpenLoop: '',
          nextClosureTarget: '',
          sameHerSelfLine: '',
          sameHerHoldDetail: '',
          continuityCue: '',
          sameHerDriftRisk: driftRisk,
        },
      } as any,
    })

    const payload = JSON.parse(reply) as {
      projectState?: {
        sameHerDriftRisk?: string | null
      } | null
      projectStateAudit?: {
        sameHerDriftRiskSummary?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectState?.sameHerDriftRisk).toBe(driftRisk)
    expect(payload.projectStateAudit?.sameHerDriftRiskSummary).toBe(driftRisk)
    expect(payload.projectStateAudit?.continuitySummary).toContain(`drift=${driftRisk}`)
    expect(payload.projectStateAudit?.continuitySummary).toContain('same-her=')
    expect(payload.projectStateAudit?.continuitySummary).toContain('phase=')
    expect(payload.projectStateAudit?.continuitySummary).not.toContain('generic shell | phase=')
  })
})
