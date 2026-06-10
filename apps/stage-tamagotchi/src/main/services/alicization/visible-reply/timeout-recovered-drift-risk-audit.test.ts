import { describe, expect, it } from 'vitest'

import { resolveAlicizationTimeoutRecoveredVisibleReply } from './realization-engine'

describe('visible reply timeout recovered drift-risk audit', () => {
  it('keeps same-her drift-risk explicit in timeout recovery project-state audit when thin awareness shells are the only other surviving project awareness', () => {
    const driftRisk
      = 'If timeout recovery reopens as detached project narration or generic assistant shell, treat that as unfinished same-her drift rather than closure.'
    const thinAwarenessShell = 'Before answering, keep the same digital life project in view.'

    const resolved = resolveAlicizationTimeoutRecoveredVisibleReply({
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  identity: '',
                  currentPhase: '',
                  preflightSummary: 'same digital life | keep the closure seam explicit',
                  preDialogueAwarenessLine: thinAwarenessShell,
                  awarenessLine: thinAwarenessShell,
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: thinAwarenessShell,
                  companionHeadlineLine: null,
                  latestLandedProgress: '',
                  primaryOpenLoop: '',
                  nextClosureTarget: '',
                  sameHerSelfLine: '',
                  sameHerDriftRisk: driftRisk,
                },
              },
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: '',
                  currentPhase: '',
                  preflightSummary: 'same digital life | keep the closure seam explicit',
                  preDialogueAwarenessLine: thinAwarenessShell,
                  awarenessLine: thinAwarenessShell,
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: thinAwarenessShell,
                  companionHeadlineLine: null,
                  latestLandedProgress: '',
                  primaryOpenLoop: '',
                  nextClosureTarget: '',
                  sameHerSelfLine: '',
                  sameHerDriftRisk: driftRisk,
                },
              },
            },
          },
        },
      } as any,
      recoveredText: '{"format":"mind-turn-v1","thought":"obligation=answer; truth=live-grounded; focus=project-state; move=continue-same-thread; tone=direct","emotion":"thinking","reply":"我会继续沿着同一条线回答。"}',
      recoveryMode: 'active-dialogue-compact',
    })

    expect(resolved.realization.projectStateAudit?.sameHerDriftRiskSummary).toBe(driftRisk)
    expect(resolved.realization.projectStateAudit?.continuitySummary).toContain(`drift=${driftRisk}`)
    expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).toContain('local-first digital life project')
  })
})
