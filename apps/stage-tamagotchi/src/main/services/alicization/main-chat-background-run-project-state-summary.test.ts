import { describe, expect, it } from 'vitest'

import { mainChatBackgroundRunTestInternals } from './main-chat-background-run'

describe('main chat background run project-state summary', () => {
  it('keeps same-her, phase, landed, open, next before body in host-visible project-state continuity carry', () => {
    const continuitySummary = mainChatBackgroundRunTestInternals.buildProjectStateAuditContinuitySummary({
      sameHerSummary: 'This reply still belongs to one living her.',
      currentPhaseSummary: 'Phase 1: Local Digital Life',
      landedProgressSummary: 'Pre-dialogue project awareness now survives into the host-visible reply.',
      openClosureSummary: 'Embodiment and initiative still need one same-life closure line.',
      nextClosureTargetSummary: 'Keep the project-state self-brief explicit before local reply detail takes over.',
      emotionalClosureSummary: 'Keep the same living line low-pressure and do not widen outward too early.',
      embodimentClosureSummary: 'Visible continuity still relies mainly on voice and motion.',
    })

    expect(continuitySummary).toBe(
      'same-her=This reply still belongs to one living her.'
      + ' | phase=Phase 1: Local Digital Life'
      + ' | landed=Pre-dialogue project awareness now survives into the host-visible reply.'
      + ' | open=Embodiment and initiative still need one same-life closure line.'
      + ' | next=Keep the project-state self-brief explicit before local reply detail takes over.'
      + ' | closure=Keep the same living line low-pressure and do not widen outward too early.'
      + ' | body=Visible continuity still relies mainly on voice and motion.',
    )
  })

  it('keeps host-corrected same-person continuity authority over generic progress recap pressure in project-state audit text preference', () => {
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    expect(mainChatBackgroundRunTestInternals.preferRicherProjectStateAuditText({
      current: correctedSamePersonAuthority,
      candidate: genericProgressRecapPressure,
    })).toBe(correctedSamePersonAuthority)
    expect(mainChatBackgroundRunTestInternals.preferRicherProjectStateAuditText({
      current: genericProgressRecapPressure,
      candidate: correctedSamePersonAuthority,
    })).toBe(correctedSamePersonAuthority)
  })
})
