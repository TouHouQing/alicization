import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'

describe('main chat timeout fallback continuity arc audit', () => {
  it('keeps continuity arc stage explicit in timeout fallback project-state audit and continuity summary', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const continuityArcStage = 'hold-for-opening'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-continuity-arc-audit',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但这次别把 hold-for-opening 这段 same-her 弧线弄丢。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.67,
        channels: [],
        summary: 'timeout fallback should keep hold-for-opening explicit in project-state audit continuity',
        projectState: {
          preflightSummary: projectState.preflightSummary,
          preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: projectState.sameHerSelfLine,
          sameHerDriftRisk: projectState.sameHerDriftRisk,
          continuityArcStage,
          continuityCue: 'project-state-carry',
        },
      } as any,
    })

    const payload = JSON.parse(reply) as {
      projectState?: {
        continuityArcStage?: string | null
      } | null
      projectStateAudit?: {
        continuityArcStage?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectState?.continuityArcStage).toBe(continuityArcStage)
    expect(payload.projectStateAudit?.continuityArcStage).toBe(continuityArcStage)
    expect(payload.projectStateAudit?.continuitySummary).toContain(`arc=${continuityArcStage}`)
    expect(payload.projectStateAudit?.continuitySummary).toContain(`cue=project-state-carry`)
  })
})
