import { describe, expect, it } from 'vitest'

import { mainChatBackgroundRunTestInternals } from './main-chat-background-run'

describe('main chat background run project-state summary', () => {
  it('keeps dynamic continuity facts in stable order without legacy key-value governance markers', () => {
    const continuitySummary = mainChatBackgroundRunTestInternals.buildProjectStateAuditContinuitySummary({
      sameHerSummary: 'The reply references a saved preference from the current conversation',
      currentPhaseSummary: 'The active workspace remains available',
      landedProgressSummary: 'The provider result was settled and stored',
      openClosureSummary: 'A follow-up task remains unresolved',
      nextClosureTargetSummary: 'The next turn can revisit that task',
      emotionalClosureSummary: 'The current emotional state is steady',
      embodimentClosureSummary: 'Voice and motion state are available',
    })

    expect(continuitySummary).toBe(
      'Continuity anchor: The reply references a saved preference from the current conversation.'
      + ' Phase: The active workspace remains available.'
      + ' Landed progress: The provider result was settled and stored.'
      + ' Open focus: A follow-up task remains unresolved.'
      + ' Next focus: The next turn can revisit that task.'
      + ' Emotional closure: The current emotional state is steady.'
      + ' Embodiment closure: Voice and motion state are available.',
    )
    expect(continuitySummary).not.toMatch(/(?:same-her|project_anchor|phase|landed|open|next|closure|body)=/iu)
  })

  it('keeps a rest-protective host correction over a generic progress recap', () => {
    const correctedSamePersonAuthority
      = 'The host correction uses a rest-protective return before reopening the topic.'
    const genericProgressRecapPressure
      = 'A concise progress recap can continue before the topic widens again.'

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
