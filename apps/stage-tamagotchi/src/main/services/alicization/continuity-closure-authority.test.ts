import { describe, expect, it } from 'vitest'

import {
  hasGenericContinuityModeMenu,
  preferStrongerContinuityClosureAuthority,
} from './continuity-closure-authority'

describe('continuity closure authority', () => {
  it('treats truncated generic continuity menus as generic mode menus', () => {
    const truncatedGenericMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-'

    expect(hasGenericContinuityModeMenu(truncatedGenericMenu)).toBe(true)
  })

  it('keeps explicit measured-return authority over a truncated generic continuity menu', () => {
    const explicitMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.'
    const truncatedGenericMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-'

    expect(preferStrongerContinuityClosureAuthority(
      explicitMeasuredReturnClosure,
      truncatedGenericMenu,
    )).toBe(explicitMeasuredReturnClosure)
    expect(preferStrongerContinuityClosureAuthority(
      truncatedGenericMenu,
      explicitMeasuredReturnClosure,
    )).toBe(explicitMeasuredReturnClosure)
  })

  it('keeps host-corrected same-person continuity authority over generic progress or status recap pressure', () => {
    const correctedSamePersonAuthority = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    expect(preferStrongerContinuityClosureAuthority(
      correctedSamePersonAuthority,
      genericProgressRecapPressure,
    )).toBe(correctedSamePersonAuthority)
    expect(preferStrongerContinuityClosureAuthority(
      genericProgressRecapPressure,
      correctedSamePersonAuthority,
    )).toBe(correctedSamePersonAuthority)
  })

  it('keeps returned-side visible-reply same-her continuity over broader project-state widening guidance', () => {
    const visibleReplySameHerAuthority = 'dialogue-runtime hold: returned-side visible reply must stay on the same Phase 1 living line before any project summary widens'
    const broaderProjectStateGuidance = 'same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".'

    expect(preferStrongerContinuityClosureAuthority(
      visibleReplySameHerAuthority,
      broaderProjectStateGuidance,
    )).toBe(visibleReplySameHerAuthority)
    expect(preferStrongerContinuityClosureAuthority(
      broaderProjectStateGuidance,
      visibleReplySameHerAuthority,
    )).toBe(visibleReplySameHerAuthority)
  })

  it('keeps remembered-seam more-room measured-return authority over a broader canonical same-her shell', () => {
    const rememberedSeamMoreRoomAuthority = 'same-her hold: recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.'
    const broaderProjectStateGuidance = 'same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".'

    expect(preferStrongerContinuityClosureAuthority(
      rememberedSeamMoreRoomAuthority,
      broaderProjectStateGuidance,
    )).toBe(rememberedSeamMoreRoomAuthority)
    expect(preferStrongerContinuityClosureAuthority(
      broaderProjectStateGuidance,
      rememberedSeamMoreRoomAuthority,
    )).toBe(rememberedSeamMoreRoomAuthority)
  })

  it('keeps host-confirmed resume confirmation boundaries over a broader canonical same-her shell', () => {
    const hostConfirmedResumeBoundary = 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.'
    const broaderProjectStateGuidance = 'same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".'

    expect(preferStrongerContinuityClosureAuthority(
      hostConfirmedResumeBoundary,
      broaderProjectStateGuidance,
    )).toBe(hostConfirmedResumeBoundary)
    expect(preferStrongerContinuityClosureAuthority(
      broaderProjectStateGuidance,
      hostConfirmedResumeBoundary,
    )).toBe(hostConfirmedResumeBoundary)
  })

  it('keeps explicit repair-before-closeness authority over a broader generic continuity menu that only lists repair-first as one mode', () => {
    const explicitRepairFirstClosure = 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again'
    const genericContinuityMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'

    expect(preferStrongerContinuityClosureAuthority(
      explicitRepairFirstClosure,
      genericContinuityMenu,
    )).toBe(explicitRepairFirstClosure)
    expect(preferStrongerContinuityClosureAuthority(
      genericContinuityMenu,
      explicitRepairFirstClosure,
    )).toBe(explicitRepairFirstClosure)
  })

  it('keeps explicit measured-return callback hold detail over the broader project continuity cue', () => {
    const explicitMeasuredReturnHoldDetail = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const broaderProjectContinuityCue = 'same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.'

    expect(preferStrongerContinuityClosureAuthority(
      explicitMeasuredReturnHoldDetail,
      broaderProjectContinuityCue,
    )).toBe(explicitMeasuredReturnHoldDetail)
    expect(preferStrongerContinuityClosureAuthority(
      broaderProjectContinuityCue,
      explicitMeasuredReturnHoldDetail,
    )).toBe(explicitMeasuredReturnHoldDetail)
  })

  it('keeps blocked-dispatch safety gate hold detail over the broader project continuity cue', () => {
    const blockedDispatchHoldDetail = 'same-her hold: blocked-dispatch safety gate says confirmation=required permission=none risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started effect=mutate before another execution-shaped opening.'
    const broaderProjectContinuityCue = 'same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.'

    expect(preferStrongerContinuityClosureAuthority(
      blockedDispatchHoldDetail,
      broaderProjectContinuityCue,
    )).toBe(blockedDispatchHoldDetail)
    expect(preferStrongerContinuityClosureAuthority(
      broaderProjectContinuityCue,
      blockedDispatchHoldDetail,
    )).toBe(blockedDispatchHoldDetail)
  })

  it('keeps host-confirmed redispatch boundaries over the broader project continuity cue even when the hold detail is compacted', () => {
    const compactResumeBoundaryHoldDetail = 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation'
    const broaderProjectContinuityCue = 'same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.'

    expect(preferStrongerContinuityClosureAuthority(
      compactResumeBoundaryHoldDetail,
      broaderProjectContinuityCue,
    )).toBe(compactResumeBoundaryHoldDetail)
    expect(preferStrongerContinuityClosureAuthority(
      broaderProjectContinuityCue,
      compactResumeBoundaryHoldDetail,
    )).toBe(compactResumeBoundaryHoldDetail)
  })
})
