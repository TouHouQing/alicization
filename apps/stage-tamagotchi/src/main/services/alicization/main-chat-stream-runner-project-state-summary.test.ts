import { describe, expect, it } from 'vitest'

import { mainChatStreamRunnerTestInternals } from './main-chat-stream-runner'

describe('main chat stream runner project-state summary', () => {
  it('keeps same-her, phase, landed, open, next before body in stream host-visible continuity carry', () => {
    const continuitySummary = mainChatStreamRunnerTestInternals.buildProjectStateAuditContinuitySummary({
      sameHerSummary: 'This stream reply still belongs to one living her.',
      currentPhaseSummary: 'Phase 1: Local Digital Life',
      landedProgressSummary: 'Pre-dialogue project awareness already survives into stream preparation.',
      openClosureSummary: 'Execution, memory, and embodiment still need one same-life closure line.',
      nextClosureTargetSummary: 'Keep the explicit project self-brief alive before local streaming detail takes over.',
      emotionalClosureSummary: 'Keep the same living line low-pressure and do not widen outward too early.',
      embodimentClosureSummary: 'Visible continuity still relies mainly on face and voice.',
    })

    expect(continuitySummary).toBe(
      'same-her=This stream reply still belongs to one living her.'
      + ' | phase=Phase 1: Local Digital Life'
      + ' | landed=Pre-dialogue project awareness already survives into stream preparation.'
      + ' | open=Execution, memory, and embodiment still need one same-life closure line.'
      + ' | next=Keep the explicit project self-brief alive before local streaming detail takes over.'
      + ' | closure=Keep the same living line low-pressure and do not widen outward too early.'
      + ' | body=Visible continuity still relies mainly on face and voice.',
    )
  })

  it('keeps audible-body rejoin body continuity explicit in final continuity carry when body, lipsync, and voice are the surviving same-her line', () => {
    const continuitySummary = mainChatStreamRunnerTestInternals.buildProjectStateAuditContinuitySummary({
      sameHerSummary: 'This stream reply still belongs to one living her.',
      currentPhaseSummary: 'Phase 1: Local Digital Life',
      landedProgressSummary: 'Pre-dialogue project awareness already survives into stream preparation.',
      openClosureSummary: 'Execution, memory, and embodiment still need one same-life closure line.',
      nextClosureTargetSummary: 'Keep the explicit project self-brief alive before local streaming detail takes over.',
      emotionalClosureSummary: 'Keep the same living line low-pressure and do not widen outward too early.',
      embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, so audible-body rejoin is already keeping the living audio thread intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.',
    })

    expect(continuitySummary).toContain('body=Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, so audible-body rejoin is already keeping the living audio thread intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.')
    expect(continuitySummary).toContain('same-her=This stream reply still belongs to one living her.')
    expect(continuitySummary).toContain('phase=Phase 1: Local Digital Life')
  })
})
