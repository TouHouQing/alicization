import { describe, expect, it } from 'vitest'

import {
  buildPresenceOnlyHoldContinuityProjection,
  buildPresenceOnlyHoldCurrentConsciousFrame,
} from './runtime-subconscious-tick'

const oldTemplatePattern = new RegExp([
  ['Before answer', 'ing'].join(''),
  ['identity-', 'continuity'].join(''),
].join('|'), 'iu')

function expectNoOldTemplate(value: unknown) {
  expect(JSON.stringify(value ?? null)).not.toMatch(oldTemplatePattern)
}

describe('presence-only subconscious continuity cleanup', () => {
  it('does not synthesize remembered-boundary relationship cadence in continuity projection', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: null,
      continuityRestraint: 'measured-return',
      openingGuidance: 'relationship_cadence=remembered_boundary; room=more; reentry=slower',
      projectContinuityCue: 'structured continuity digest.',
      initiativeWhy: 'Keep this callback on the continuity state.',
    })

    expect(projection).toEqual(expect.objectContaining({
      sameHerHoldDetail: '',
      openingGuidance: '',
      manifestationCadenceSummary: '',
    }))
    expectNoOldTemplate(projection)
  })

  it('carries natural remembered-seam text without converting it into internal cue templates', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: {
        summary: 'quiet resident hold',
        manifestationCadenceSummary: null,
        openingGuidance: null,
        selfContinuityAuthority: {
          inwardLine: 'The remembered seam should reopen with more room.',
          sourceTags: ['resident-hold'],
        },
      },
      continuityRestraint: 'measured-return',
      openingGuidance: 'Recognize the remembered seam, but keep more room this time.',
      projectContinuityCue: null,
      initiativeWhy: null,
    })

    expect(projection?.sameHerHoldDetail).toBeNull()
    expect(projection?.selfContinuityAuthority?.inwardLine).toContain('remembered seam')
    expectNoOldTemplate(projection)
  })

  it('keeps presence-only current conscious frames free of fixed template hold details', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        reasonTags: ['resident-hold', 'cadence=measured_return'],
        consciousNeed: 'Leave more room before outward reply.',
        speakingIntention: 'Stay on the same remembered line without reopening from scratch.',
        projectState: {
          sameHerHoldDetail: 'relationship_cadence=remembered_boundary; room=more',
          continuityCue: 'continuity_hold=measured_return',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
        },
      },
      continuityRestraint: 'measured-return',
      holdDetail: 'relationship_cadence=remembered_boundary; room=more',
      projectStateCarry: {
        continuityCue: 'Recognize the remembered seam, but keep more room this time.',
      },
    })

    expect(frame?.projectState?.sameHerHoldDetail).toBeNull()
    expect(frame?.projectState?.continuityCue).toBe('Recognize the remembered seam, but keep more room this time.')
    expect(frame?.reasonTags).toEqual(expect.arrayContaining([
      'resident-hold',
      'continuity-arc:same-thread-continuation',
      'continuity-timing:next-open-window',
    ]))
    expectNoOldTemplate(frame)
  })
})
