import { describe, expect, it } from 'vitest'

import {
  normalizeProviderFacingMindTurnContract,
  rebuildProviderFacingMindTurnContract,
} from './main-chat-session-runtime'

describe('main chat session runtime drift-risk summary alias', () => {
  it('keeps same-her drift-risk summary alias explicit when rebuilding and normalizing a provider-facing contract from drift-risk-only runtime authority', () => {
    const driftRisk
      = 'If provider-facing project state reopens as detached project narration or generic assistant shell, treat that as unfinished same-her drift rather than closure.'

    const runtimeSurface = {
      digitalLifeRuntimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: '',
              currentPhase: '',
              preflightSummary: '',
              preDialogueAwarenessLine: '',
              awarenessLine: '',
              preDialogueAwarenessSummary: '',
              latestLandedProgress: '',
              primaryOpenLoop: '',
              nextClosureTarget: '',
              sameHerSelfLine: '',
              sameHerHoldDetail: '',
              sameHerDriftRisk: driftRisk,
            },
          },
        },
      },
      digitalLifeSpine: null,
    } as any

    const rebuilt = rebuildProviderFacingMindTurnContract({
      contract: null,
      governance: {
        answerSubject: 'project-state',
        answerAct: 'answer',
        turnMode: 'answer',
        truthState: 'live-observed',
        personaKernelMode: 'full',
      } as any,
      runtimeSurface,
    })

    expect(rebuilt?.projectState?.sameHerDriftRisk).toBe(driftRisk)
    expect((rebuilt?.projectState as { sameHerDriftRiskSummary?: string | null } | null)?.sameHerDriftRiskSummary)
      .toBe(driftRisk)

    const normalized = normalizeProviderFacingMindTurnContract(
      rebuilt as any,
      null,
      runtimeSurface,
    )

    expect(normalized?.projectState?.sameHerDriftRisk).toBe(driftRisk)
    expect((normalized?.projectState as { sameHerDriftRiskSummary?: string | null } | null)?.sameHerDriftRiskSummary)
      .toBe(driftRisk)
  })
})
