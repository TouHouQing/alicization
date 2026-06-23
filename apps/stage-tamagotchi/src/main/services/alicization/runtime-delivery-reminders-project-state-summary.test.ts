import { describe, expect, it } from 'vitest'

import { runtimeDeliveryReminderTestInternals } from './runtime-delivery-reminders'

describe('runtime delivery reminder project-state summary', () => {
  it('keeps project-state continuity lines in same-her, phase, landed, open, next order before body carry', () => {
    const continuitySummary = runtimeDeliveryReminderTestInternals.buildProjectStateContinuitySummary({
      sameHerSummary: 'One same living line stays continuous.',
      currentPhaseSummary: 'Phase 1: Local Digital Life',
      landedProgressSummary: 'Pre-dialogue carry now lands before the visible reminder turn.',
      openClosureSummary: 'Memory and initiative still need tighter same-her closure.',
      nextClosureTargetSummary: 'Keep the same-her project briefing explicit before local reminder detail takes over.',
      embodimentClosureSummary: 'Voice and motion still need stronger cross-modal alignment.',
    })

    expect(continuitySummary).toBe(
      'same-her=One same living line stays continuous.'
      + ' | phase=Phase 1: Local Digital Life'
      + ' | landed=Pre-dialogue carry now lands before the visible reminder turn.'
      + ' | open=Memory and initiative still need tighter same-her closure.'
      + ' | next=Keep the same-her project briefing explicit before local reminder detail takes over.'
      + ' | body=Voice and motion still need stronger cross-modal alignment.',
    )
  })
})
