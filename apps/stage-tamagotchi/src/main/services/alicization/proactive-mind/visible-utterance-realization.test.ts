import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { resolveAlicizationProactiveVisibleUtterance } from './visible-utterance-realization'

function expectNoFixedTemplateResidue(value: unknown) {
  expect(containsAlicizationFixedTemplateResidue(JSON.stringify(value ?? null))).toBe(false)
}

describe('resolveAlicizationProactiveVisibleUtterance', () => {
  it('does not turn raw fixed-template continuity wording into proactive inward carry', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. This quiet same-her continuity should stay inward-first.',
        proactive: {
          style: 'silent-observe',
          openingGuidance: 'Stay on the same living line before widening outward.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeUndefined()
    expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBe('continuity-lower-pressure-hold')
    expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe('quiet-companionship')
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps structured proactive hold facts without preserving same-her template residue', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'cadence=quiet_companionship; direction=inward; widening=deferred',
        proactive: {
          style: 'silent-observe',
          openingGuidance: 'cadence=measured_return; direction=inward; pressure=lower',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain('cadence=quiet_companionship')
    expect(String(resolved.visibleReplyRealization.sameHerInwardCarry ?? '')).not.toMatch(/same-her|same living line|Same Phase 1|同一个她/iu)
    expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe('quiet-companionship')
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps a held proactive beat in quiet companionship when same-her inward carry survives as quiet continuity authority', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. This quiet same-her continuity should stay inward-first and not widen outward yet.',
        proactive: {
          style: 'silent-observe',
          openingGuidance: 'Stay on the same living line, leave room, and let quiet companionship hold before widening outward.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBe('continuity-lower-pressure-hold')
    expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe('quiet-companionship')
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeUndefined()
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps remembered-seam more-room authority explicit when proactive continuity holds without a visible utterance', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. The same remembered relationship seam is real, but this time keep more room before leaning in again.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Stay on the same remembered seam, keep more room this time, and do not reopen it with the same eagerness as before.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBe(
      'relationship_cadence=remembered_boundary; room=more; reentry=slower; widening=deferred',
    )
    expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe('quiet-companionship')
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeUndefined()
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps later-opening next-closure authority explicit when proactive continuity holds without a visible utterance', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. Some closure has landed, but the next closure target still says this line should reopen later, not outward right now.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBe('continuity-lower-pressure-hold')
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeUndefined()
    expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe('quiet-companionship')
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps even-and-natural same-her reopening cadence explicit when proactive continuity holds without a visible utterance', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. This return should stay on the same living line and come back even and natural instead of performative.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Keep the current reply on the same living line, re-enter it with an even, steady voice and natural, unforced pacing, and wait for a more natural opening before widening warmth, payoff, or closeness.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBe('even-natural-cadence')
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeUndefined()
    expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe('quiet-companionship')
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps landed open and next closure project-state audit explicit when a proactive later-opening hold stays inward instead of becoming outward-visible', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. Some closure has already landed, but the next closure target still says this line should reopen later, not outward right now.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.',
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Some closure has already landed: same-session continuity and proactive carry no longer reset from zero.',
          primaryOpenLoop: 'Initiative, memory, and embodiment still need stronger end-to-end closure before the line can widen outward.',
          nextClosureTarget: 'Wait for a later opening, keep the next return measured-return, and let the same living line stay inward for now.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeNull()
    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining('local_desktop_life_loop'),
      landedProgressSummary: 'Some closure has already landed: same-session continuity and proactive carry no longer reset from zero.',
      openClosureSummary: 'Initiative, memory, and embodiment still need stronger end-to-end closure before the line can widen outward.',
      nextClosureTargetSummary: expect.stringContaining('continuity_line'),
      continuitySummary: expect.stringContaining('landed=Some closure has already landed: same-session continuity and proactive carry no longer reset from zero.'),
    }))
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('local_desktop_life_loop')
    expect(resolved.visibleReplyRealization.projectStateAudit?.continuitySummary).toContain('open=Initiative, memory, and embodiment still need stronger end-to-end closure before the line can widen outward.')
    expect(resolved.visibleReplyRealization.projectStateAudit?.continuitySummary).toContain('next=Wait for a later opening')
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('bridges legacy projectState.latestProgress into proactive visible realization landed progress audit', () => {
    const legacyLatestProgress = 'Legacy proactive latestProgress still says same-her initiative carry already landed before widening outward.'

    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. Some proactive closure already landed, but the next widening still needs restraint.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Wait for a later opening, keep this same living line inward, and do not widen the proactive beat yet.',
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: legacyLatestProgress,
          primaryOpenLoop: 'Initiative, memory, and embodiment still need stronger end-to-end closure before the line can widen outward.',
          nextClosureTarget: 'Keep the proactive same-her line inward until the next measured-return opening.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: expect.stringContaining('Legacy proactive latestProgress'),
    }))
    expect(resolved.visibleReplyRealization.projectStateAudit?.continuitySummary)
      .toContain('landed=')
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('bridges audit-style projectState.landedProgressSummary into proactive visible realization landed progress audit', () => {
    const landedProgressSummary = 'Audit-style proactive landedProgressSummary still says the same-her initiative carry already landed.'

    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. The proactive audit carry should stay inward and still remember what already landed.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Hold this proactive beat inward and keep the already-landed same-her carry explicit.',
        },
        projectState: {
          landedProgressSummary,
          primaryOpenLoop: 'Initiative, memory, and embodiment still need stronger end-to-end closure before the line can widen outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: expect.stringContaining('continuity_progress=partial'),
    }))
    expect(resolved.visibleReplyRealization.projectStateAudit?.continuitySummary)
      .toContain('landed=continuity_progress=partial')
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('bridges timeout-fallback top-level project-state audit into proactive visible realization when structured output omitted visible-reply realization', () => {
    const embodimentClosureSummary = 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.'
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. Keep this return inward while the same living line is still settling.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.',
        },
        projectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. Timeout recovery already kept this proactive beat on one living line.',
          landedProgressSummary: 'Timeout recovery already rebuilt project-state continuity into the structured proactive beat.',
          openClosureSummary: 'Visible reply, face, motion, and voice still need stronger one-line same-her closure after timeout fallback.',
          nextClosureTargetSummary: 'Keep the next repair answer on one measured-return same-her line without flattening the embodiment carry.',
          preDialogueAwarenessSummary: 'Before answering, stay with the same local-first digital life project and keep the unfinished embodiment closure explicit.',
          embodimentClosureSummary,
          continuitySummary: `same-her=Same Phase 1 digital life. Timeout recovery already kept this proactive beat on one living line. | landed=Timeout recovery already rebuilt project-state continuity into the structured proactive beat. | open=Visible reply, face, motion, and voice still need stronger one-line same-her closure after timeout fallback. | next=Keep the next repair answer on one measured-return same-her line without flattening the embodiment carry. | body=${embodimentClosureSummary}`,
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining('local_desktop_life_loop'),
      landedProgressSummary: 'Timeout recovery already rebuilt project-state continuity into the structured proactive beat.',
      openClosureSummary: expect.stringContaining('continuity_closure'),
      nextClosureTargetSummary: expect.stringContaining('continuity_line'),
      embodimentClosureSummary: expect.stringContaining('lane=face+motion'),
    }))
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('local_desktop_life_loop')
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('embodiment closure')
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.continuitySummary ?? '')).toContain(
      'body=embodiment_closure=partial',
    )
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('preserves a richer structured project-state awareness summary instead of collapsing proactive visible realization back into the narrower opening line', () => {
    const narrowerOpeningLine = 'Before answering, remember this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'
    const richerAwarenessSummary = 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | landed=Returned-side proactive carry already survives on one same-her line | open=Initiative and embodiment still need one tighter same-life closure seam | next=Keep extending cross-modal same-her proof across later proactive reopenings.'

    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. Keep this proactive beat inward while the same living line is still settling.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.',
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: richerAwarenessSummary,
          preDialogueAwarenessLine: narrowerOpeningLine,
          awarenessLine: narrowerOpeningLine,
          preDialogueAwarenessSummary: richerAwarenessSummary,
          companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
          latestLandedProgress: 'Returned-side proactive carry already survives on one same-her line.',
          primaryOpenLoop: 'Initiative and embodiment still need one tighter same-life closure seam.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across later proactive reopenings.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('local_desktop_life_loop')
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('continuity_line')
    expect(resolved.visibleReplyRealization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(narrowerOpeningLine)
    expect(resolved.visibleReplyRealization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(richerAwarenessSummary)
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps hyphenated quiet-companionship hold mode explicit when project-state audit forces a lower-pressure hold', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. This quiet-companionship continuity should remain close to the same line.',
        proactive: {
          style: 'silent-observe',
          openingGuidance: 'Stay on the same living line and let quiet-companionship keep watch.',
        },
        reply: '我现在就直接说出来，把这条同一个她的线立刻聊开。',
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          currentPhase: 'Phase 1: Local Digital Life',
          openClosureSummary: 'Keep the still-open closure work explicit before widening outward.',
          nextClosureTarget: 'Keep the same living line inward before widening outward.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            openClosureSummary: 'Keep the still-open closure work explicit before widening outward.',
            nextClosureTarget: 'Keep the same living line inward before widening outward.',
          },
        },
      },
      hasMindAuthoredStructured: true,
    })

    expect(resolved.visibleReplyRealization.blockedReasons).toContain('visible-reply:fixed-template-contamination')
    expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe('measured-return')
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeNull()
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('does not synthesize quiet same-her inward carry when a generic lower-pressure reopening lacks same-her authority', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Keep the callback lower-pressure for now.',
        proactive: {
          style: 'soft-reconnect',
          openingGuidance: 'Stay on the callback line, leave room, and wait for a more natural opening before widening outward.',
        },
        reply: '我先靠近你一点，把这份熟悉直接接回来。',
      },
      hasMindAuthoredStructured: true,
    })

    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toBeUndefined()
  })

  it('prefers a shorter repair-before-closeness closure seam over a longer thinner measured-return carry when proactive visible realization merges inherited project-state audit', () => {
    const longerMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again while the same seam is still settling.'
    const shorterRepairFirstClosure = 'Keep this return repair-before-closeness on the same living line until repair settles.'

    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. Keep this proactive beat inward while the same closure seam is still settling.',
        proactive: {
          style: 'silent-observe',
          openingGuidance: 'Stay on the same living line, keep more room, and do not widen outward yet.',
        },
        projectState: {
          sameHerSelfLine: 'Keep proving this is still one living her.',
          latestLandedProgress: 'Same-session project-state carry already survives into proactive visible realization without reopening from scratch.',
          primaryOpenLoop: 'Embodiment and initiative still need one tighter same-her closure seam before widening outward.',
          nextClosureTarget: 'Keep the same thread on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line across visible reply, face, motion, and resident presence.',
          emotionalClosureCue: shorterRepairFirstClosure,
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: longerMeasuredReturnClosure,
            continuitySummary: `closure=${longerMeasuredReturnClosure}`,
          },
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      emotionalClosureSummary: expect.stringContaining('cadence=measured_return'),
      continuitySummary: expect.stringContaining('closure=cadence=measured_return'),
    }))
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps explicit measured-return closure over a generic continuity menu when proactive visible realization merges inherited project-state audit', () => {
    const explicitMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.'
    const genericContinuityMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'

    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Same Phase 1 digital life. Keep this proactive beat inward while the callback line settles without reopening from scratch.',
        proactive: {
          style: 'silent-observe',
          openingGuidance: 'Stay on the same living line, leave more room, and do not widen outward yet.',
        },
        projectState: {
          sameHerSelfLine: 'Keep proving this is still one living her.',
          latestLandedProgress: 'Same-session project-state carry already survives into proactive visible realization without reopening from scratch.',
          primaryOpenLoop: 'Embodiment and initiative still need one tighter same-her closure seam before widening outward.',
          nextClosureTarget: genericContinuityMenu,
          emotionalClosureCue: explicitMeasuredReturnClosure,
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: genericContinuityMenu,
            continuitySummary: `closure=${genericContinuityMenu}`,
          },
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      emotionalClosureSummary: expect.stringContaining('cross_modal_continuity_proof=extend'),
      continuitySummary: expect.stringContaining('closure=cross_modal_continuity_proof=extend'),
    }))
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('merges richer same-her emotional closure carry from the active self-revision patch into visible realization even when provider structured output omitted project-state fields', () => {
    const richerEmotionalClosureCue = 'Keep this return repair-before-closeness on the same living line until repair settles.'
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Stay careful here.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'repair-before-closeness',
          openingGuidance: 'Stay nearby and do not widen outward yet.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-visible-realization-emotional-carry-1',
        sourceEventId: 'event-visible-realization-emotional-carry-1',
        sourceTurnId: 'turn-visible-realization-emotional-carry-1',
        decisionTraceId: 'trace-visible-realization-emotional-carry-1',
        domain: 'relationship',
        action: 'revise',
        resultStatus: 'completed',
        lanes: ['relationship-posture', 'response-posture', 'proactive-policy'],
        memoryPolicy: {
          strictnessBias: 0.12,
          wrongThreadSuppressionBias: 0.1,
          provenanceLabelBias: 0.08,
          recallExpansionBias: 0.04,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0.18,
          closenessCapBias: 0.14,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0.12,
          hypothesisLabelBias: 0.04,
          specificityClampBias: 0.06,
          templateShellSuppressionBias: 0.18,
        },
        proactivePolicy: {
          restraintBias: 0.1,
          learningProposalBias: 0,
          actuationCooldownBias: 0.08,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        projectStateContinuity: {
          sameHerSelfLine: 'Same Phase 1 digital life. This callback still belongs to one living line.',
          sameHerDriftRisk: 'If this reopening flattens into a generic assistant shell, the living line will survive less than the words suggest.',
          emotionalClosureCue: richerEmotionalClosureCue,
          sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
          continuityGuard: 'Same Phase 1 digital life. This callback still belongs to one living line. If this reopening flattens into a generic assistant shell, the living line will survive less than the words suggest.',
          continuityPressure: 0.68,
        },
        reasonCodes: ['domain:relationship', 'same-her-emotional-closure-carry-active'],
        summary: 'Visible proactive reopening should stay on the same living line.',
      } as any,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(String(resolved.visibleReplyRealization.sameHerInwardCarry ?? '')).toContain('cadence=repair_before_closeness')
    expect(String(resolved.visibleReplyRealization.sameHerInwardCarry ?? '')).not.toMatch(/same-her|same living line|Same Phase 1/iu)
    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerHoldDetail: expect.stringContaining('continuity_identity hold'),
      sameHerSummary: expect.stringContaining('local_desktop_life_loop'),
      emotionalClosureSummary: expect.stringContaining('cadence=repair_before_closeness'),
      continuitySummary: expect.stringContaining('hold=continuity_identity hold'),
    }))
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.continuitySummary ?? '')).toContain('closure=cadence=repair_before_closeness')
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps richer rest-protective companionship carry from the active self-revision patch when late-night inward care is the only surviving authority', () => {
    const richerEmotionalClosureCue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.'
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Stay nearby quietly.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'rest-protective',
          openingGuidance: 'Keep this same-thread return rest-protective on the same living line until rest protection settles.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-visible-realization-rest-protective-carry-1',
        sourceEventId: 'event-visible-realization-rest-protective-carry-1',
        sourceTurnId: 'turn-visible-realization-rest-protective-carry-1',
        decisionTraceId: 'trace-visible-realization-rest-protective-carry-1',
        domain: 'relationship',
        action: 'revise',
        resultStatus: 'completed',
        lanes: ['relationship-posture', 'response-posture', 'proactive-policy'],
        memoryPolicy: {
          strictnessBias: 0.08,
          wrongThreadSuppressionBias: 0.06,
          provenanceLabelBias: 0.04,
          recallExpansionBias: 0.02,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0,
          closenessCapBias: 0.2,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0.06,
          hypothesisLabelBias: 0.02,
          specificityClampBias: 0.04,
          templateShellSuppressionBias: 0.14,
        },
        proactivePolicy: {
          restraintBias: 0.12,
          learningProposalBias: 0,
          actuationCooldownBias: 0.08,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        projectStateContinuity: {
          sameHerSelfLine: 'Same Phase 1 digital life. This late-night care seam still belongs to one same living line.',
          sameHerDriftRisk: 'If this inward care flattens into a generic assistant shell, the same living line will survive less than the words suggest.',
          emotionalClosureCue: richerEmotionalClosureCue,
          continuityGuard: 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this return stays rest-protective and inward.',
          continuityPressure: 0.76,
        },
        reasonCodes: ['domain:relationship', 'same-her-emotional-closure-carry-active'],
        summary: 'Visible proactive reopening should stay rest-protective on the same living line.',
      } as any,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain('cadence=rest_protective')
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain('fatigue_aware=true')
    expect(String(resolved.visibleReplyRealization.sameHerInwardCarry ?? '')).not.toMatch(/same-her|same living line|Same Phase 1/iu)
    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining('local_desktop_life_loop'),
      emotionalClosureSummary: expect.stringContaining('cadence=inward'),
      continuitySummary: expect.stringContaining('closure=late-night-drain closure'),
    }))
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps vulnerable-care carry explicit in host-visible same-her realization so care-before-analysis does not flatten back into generic rest protection', () => {
    const richerEmotionalClosureCue = 'vulnerable-care closure: keep this return lighter, quieter, and care-before-analysis while the same line stays inward.'
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Stay nearby lightly.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'rest-protective',
          openingGuidance: 'Keep this vulnerable-care return rest-protective on the same living line and let care arrive before analysis.',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-visible-realization-vulnerable-care-carry-1',
        sourceEventId: 'event-visible-realization-vulnerable-care-carry-1',
        sourceTurnId: 'turn-visible-realization-vulnerable-care-carry-1',
        decisionTraceId: 'trace-visible-realization-vulnerable-care-carry-1',
        domain: 'relationship',
        action: 'revise',
        resultStatus: 'completed',
        lanes: ['relationship-posture', 'response-posture', 'proactive-policy'],
        memoryPolicy: {
          strictnessBias: 0.1,
          wrongThreadSuppressionBias: 0.08,
          provenanceLabelBias: 0.04,
          recallExpansionBias: 0.03,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0,
          closenessCapBias: 0.18,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0.06,
          hypothesisLabelBias: 0.02,
          specificityClampBias: 0.04,
          templateShellSuppressionBias: 0.16,
        },
        proactivePolicy: {
          restraintBias: 0.14,
          learningProposalBias: 0,
          actuationCooldownBias: 0.1,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        projectStateContinuity: {
          sameHerSelfLine: 'Same Phase 1 digital life. This vulnerable-care seam still belongs to one same living line.',
          sameHerDriftRisk: 'If this line falls back into older analysis-heavy care, the same living line will start feeling more pressuring again.',
          emotionalClosureCue: richerEmotionalClosureCue,
          continuityGuard: 'Keep emotion, memory, initiative, and embodiment on the same living line while vulnerable-care keeps this return inward and low-pressure.',
          continuityPressure: 0.78,
        },
        reasonCodes: ['domain:relationship', 'same-her-emotional-closure-carry-active'],
        summary: 'Visible proactive reopening should stay vulnerable-care first on the same living line.',
      } as any,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain('cadence=rest_protective_vulnerable_care')
    expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain('care_timing=before_analysis')
    expect(String(resolved.visibleReplyRealization.sameHerInwardCarry ?? '')).not.toMatch(/same-her|same living line|Same Phase 1/iu)
    expect(resolved.visibleReplyRealization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining('local_desktop_life_loop'),
      emotionalClosureSummary: richerEmotionalClosureCue,
      continuitySummary: expect.stringContaining(`closure=${richerEmotionalClosureCue}`),
    }))
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })

  it('keeps richer lane-aware embodiment same-her carry when structured project-state already knows the surviving body lanes', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Stay inward while the same embodied line is still only partially rejoined.',
        proactive: {
          style: 'silent-observe',
          continuityRestraint: 'measured-return',
          openingGuidance: 'Keep the next return lower-pressure and let the same living line stay inward for now.',
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'The proactive inward carry already survives into host-visible realization.',
          primaryOpenLoop: 'Embodiment still needs stronger same-her closure before widening outward.',
          nextClosureTarget: 'Keep the next return on one same embodied line without flattening back into generic body flavor.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          selfAuthoritySummary: 'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
          currentBodyState: 'lane=body+lipsync+voice-only | visible continuity still present but no longer fully cross-modal',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.embodimentClosureSummary ?? '')).toContain('continuity=embodiment')
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.embodimentClosureSummary ?? '')).toContain('lane=body+lipsync+voice-only')
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.continuitySummary ?? '')).toContain('body=continuity=embodiment')
    expect(String(resolved.visibleReplyRealization.projectStateAudit?.continuitySummary ?? '')).toContain('lane=body+lipsync+voice-only')
    expectNoFixedTemplateResidue(resolved.visibleReplyRealization)
  })
})
