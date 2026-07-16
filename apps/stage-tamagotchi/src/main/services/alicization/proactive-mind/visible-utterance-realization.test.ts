import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { resolveAlicizationProactiveVisibleUtterance } from './visible-utterance-realization'

const generatedCuePattern
  = /\b[a-z][\w-]{2,}\s*=|runtime_personhood|life_core|local_desktop_life_loop|cadence=|relationship_cadence=|continuity_identity|continuity_line/iu

function expectNoTemplateOrGeneratedCue(value: unknown) {
  const text = JSON.stringify(value ?? null)
  expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
  expect(text).not.toMatch(generatedCuePattern)
}

describe('resolveAlicizationProactiveVisibleUtterance', () => {
  it('drops raw fixed-template continuity wording instead of turning it into proactive inward carry', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'structured continuity digest.',
        proactive: {
          style: 'silent-observe',
          openingGuidance: 'Stay on the continuity state before expansion',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeUndefined()
    expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe('quiet-companionship')
    expectNoTemplateOrGeneratedCue(resolved.visibleReplyRealization)
  })

  it('does not synthesize relationship_cadence for remembered-seam more-room holds', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'The remembered relationship seam is real, but this time keep more room before leaning in again.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Stay on the remembered seam, keep more room this time, and do not reopen it with the same eagerness as before.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBeNull()
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeFalsy()
    expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe('quiet-companionship')
    expectNoTemplateOrGeneratedCue(resolved.visibleReplyRealization)
  })

  it('preserves factual project-state audit text while dropping fixed project identity templates', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Wait for a later opening and keep the next return low-pressure.',
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building identity continuity.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'The memory workbench now exposes review policy overrides to the user.',
          primaryOpenLoop: 'Long-term memory search still needs larger-scale pagination verification.',
          nextClosureTarget: 'embedding_recall_reindex=required',
          sameHerSelfLine: 'structured continuity digest.',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: 'The memory workbench now exposes review policy overrides to the user.',
      openClosureSummary: 'Long-term memory search still needs larger-scale pagination verification.',
      nextClosureTargetSummary: null,
      preDialogueAwarenessSummary: null,
    }))
    expect(resolved.visibleReplyRealization.projectStateAudit?.continuitySummary).toBe(
      'The memory workbench now exposes review policy overrides to the user. | Long-term memory search still needs larger-scale pagination verification.',
    )
    expectNoTemplateOrGeneratedCue(resolved.visibleReplyRealization)
  })

  it('does not turn self-revision continuity cues into cadence-coded proactive carry', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        proactive: {
          style: 'silent-observe',
          openingGuidance: 'Keep this return low-pressure.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
      selfRevisionPatch: {
        lanes: [],
        reasonCodes: [],
        projectStateContinuity: {
          sameHerSelfLine: 'structured continuity digest.',
          sameHerHoldDetail: 'identity-continuity',
          emotionalClosureCue: 'repair-before-closeness should settle before closeness widens again.',
          continuityGuard: 'continuity_hold=repair_before_closeness',
          continuityPressure: 0.68,
        },
      } as any,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeFalsy()
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.sameHerHoldDetail ?? '')).toBe('')
    expectNoTemplateOrGeneratedCue(resolved.visibleReplyRealization)
  })
})
