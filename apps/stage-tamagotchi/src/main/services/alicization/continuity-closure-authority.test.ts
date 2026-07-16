import { describe, expect, it } from 'vitest'

import {
  hasGenericContinuityModeMenu,
  preferStrongerContinuityClosureAuthority,
} from './continuity-closure-authority'

describe('continuity closure authority', () => {
  it('treats truncated generic continuity menus as generic mode menus', () => {
    const truncatedGenericMenu = 'Keep extending cross-modal identity-continuity'

    expect(hasGenericContinuityModeMenu(truncatedGenericMenu)).toBe(true)
  })

  it('keeps explicit measured-return authority over a truncated generic continuity menu', () => {
    const explicitMeasuredReturnClosure = 'keep callback facts structured'
    const truncatedGenericMenu = 'Keep extending cross-modal identity-continuity'

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

  it('keeps returned-side visible-reply identity-continuity', () => {
    const visibleReplySameHerAuthority = 'dialogue-runtime hold: returned-side visible reply must stay on the same Phase 1 living line before any project summary widens'
    const broaderProjectStateGuidance = 'identity-continuity"her".'

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
    const rememberedSeamMoreRoomAuthority = 'identity-continuity'
    const broaderProjectStateGuidance = 'identity-continuity"her".'

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
    const hostConfirmedResumeBoundary = 'identity-continuity'
    const broaderProjectStateGuidance = 'identity-continuity"her".'

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
    const explicitRepairFirstClosure = 'keep callback facts structured'
    const genericContinuityMenu = 'Keep extending cross-modal identity-continuity'

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
    const explicitMeasuredReturnHoldDetail = 'identity-continuity'
    const broaderProjectContinuityCue = 'continuity state: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.'

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
    const blockedDispatchHoldDetail = 'identity-continuity'
    const broaderProjectContinuityCue = 'continuity state: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.'

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
    const compactResumeBoundaryHoldDetail = 'identity-continuity'
    const broaderProjectContinuityCue = 'continuity state: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.'

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
