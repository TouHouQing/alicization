import { describe, expect, it } from 'vitest'

import {
  normalizeProviderFacingMindTurnContract,
} from './main-chat-session-runtime'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'

describe('main chat session runtime project-state summary', () => {
  it('keeps host-corrected same-person continuity authority over generic progress recap pressure in provider-facing mind-turn contract project-state', () => {
    const canonical = resolveAlicizationProjectStateBrief()
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    const runtimeSurface = {
      digitalLifeRuntimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: canonical.identity,
              currentPhase: canonical.currentPhase,
              preDialogueAwarenessLine: canonical.preDialogueAwarenessLine,
              latestLandedProgress: canonical.continuityProgressSummary,
              primaryOpenLoop: canonical.primaryOpenLoop,
              nextClosureTarget: canonical.nextClosureTarget,
              sameHerSelfLine: canonical.sameHerSelfLine,
              sameHerHoldDetail: correctedSamePersonAuthority,
            },
          },
        },
      },
      digitalLifeSpine: null,
    } as any

    const contract = {
      projectState: {
        identity: canonical.identity,
        currentPhase: canonical.currentPhase,
        preDialogueAwarenessLine: 'template-residue-shell',
        sameHerHoldDetail: genericProgressRecapPressure,
      },
      mustDo: [],
      mustNotDo: [],
    } as any

    const normalized = normalizeProviderFacingMindTurnContract(contract, null, runtimeSurface)

    expect(normalized?.projectState).toEqual(expect.objectContaining({
      sameHerHoldDetail: correctedSamePersonAuthority,
    }))
    expect(normalized?.projectState?.sameHerHoldDetail).not.toBe(genericProgressRecapPressure)
  })
})
