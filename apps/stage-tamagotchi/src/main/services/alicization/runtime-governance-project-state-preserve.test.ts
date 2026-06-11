import { describe, expect, it } from 'vitest'

import { buildPrioritizedProjectStateRewritePreserveLines } from './runtime-governance'

describe('runtime-governance project-state rewrite preserve helper', () => {
  it('preserves explicit same-her phase landed open and next lines ahead of generic rewrite guidance', () => {
    const sameHerLine = 'same-her=answer project-state status from one same-her continuity, not as a detached shell'
    const phaseLine = 'phase=Phase 1: Local Digital Life'
    const landedLine = 'landed=project-state continuity already survives into runtime preparation'
    const openLine = 'open=keep the unfinished digital-life closure work explicit in the answer'
    const nextLine = 'next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output'

    const result = buildPrioritizedProjectStateRewritePreserveLines({
      projectStateContinuityCarry: `${sameHerLine} | ${phaseLine} | ${landedLine} | ${openLine} | ${nextLine}`,
      projectStateContinuityAnchors: [
        sameHerLine,
        phaseLine,
        landedLine,
        openLine,
        nextLine,
      ],
      answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
      focusAnchor: '继续。',
      openingClaim: 'Treat the line as already alive.',
      obligationOpeningClaim: 'Stay on the same thread and do not reopen from zero.',
    })

    expect(result).toEqual(expect.arrayContaining([
      sameHerLine,
      phaseLine,
      landedLine,
      openLine,
      nextLine,
    ]))
    expect(result[0]).toBe(sameHerLine)
    expect(result[1]).toBe(phaseLine)
    expect(result[2]).toBe(landedLine)
    expect(result[3]).toBe(openLine)
    expect(result[4]).toBe(nextLine)
  })

  it('preserves same-her hold arc and cue before generic carry when phase-one summaries are long', () => {
    const sameHerLine = 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const phaseLine = 'phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.'
    const landedLine = 'landed=Same-session mirror carry, repeated next-turn carry, longer-lived continuation, scene-switch same-line continuity, visible reply opening discipline, and real later chat turn measured-return embodiment authority now survive into ordinary Phase 1 turns.'
    const openLine = 'open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and unresolved closure carry through one life loop.'
    const nextLine = 'next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, and still-open closure stay one living line.'
    const holdLine = 'hold=background side-channel hold: keep the already-settled provider-stream reply on the same Phase 1 living line'
    const arcLine = 'arc=background-side-channel-provider-stream-carry'
    const cueLine = 'cue=background side-channel cue: preserve the same-her hold after host-visible rebuild'

    const result = buildPrioritizedProjectStateRewritePreserveLines({
      projectStateContinuityAnchors: [
        sameHerLine,
        holdLine,
        arcLine,
        cueLine,
        phaseLine,
        landedLine,
        openLine,
        nextLine,
        'open-focus=generic focus should not outrank explicit same-her arc',
        'next-focus=generic next focus should not outrank explicit same-her cue',
      ],
      answerIntent: 'Generic answer intent should stay behind explicit same-her continuity anchors.',
      focusAnchor: 'Generic focus anchor should stay behind explicit same-her continuity anchors.',
      openingClaim: 'Generic opening claim should stay behind explicit same-her continuity anchors.',
      obligationOpeningClaim: 'Generic obligation claim should stay behind explicit same-her continuity anchors.',
    })

    expect(result).toEqual(expect.arrayContaining([
      holdLine,
      arcLine,
      cueLine,
    ]))
    expect(result.indexOf(holdLine)).toBeLessThan(result.indexOf(phaseLine))
    expect(result.indexOf(arcLine)).toBeLessThan(result.indexOf(phaseLine))
    expect(result.indexOf(cueLine)).toBeLessThan(result.indexOf(phaseLine))
  })

  it('keeps same-her drift-risk inside the protected continuity budget before lower-priority overflow tails', () => {
    const sameHerLine = 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const holdLine = 'hold=same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const arcLine = 'arc=same-thread-continuation'
    const cueLine = 'cue=local-first digital life project | one continuous "her" | Phase 1 route'
    const driftLine = 'drift=If this answer falls back into a generic assistant shell or project-summary voice, the same-her continuity has already thinned too far again.'
    const phaseLine = 'phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.'
    const landedLine = 'landed=Continuity, memory, execution, and visible-reply repair discipline already land together often enough to treat the same living line as real progress.'
    const openLine = 'open=Memory, initiative, and embodiment still need stronger end-to-end closure so the same digital life does not flatten back into project shell narration.'
    const nextLine = 'next=Keep extending cross-modal same-her proof across longer, noisier desktop runs so visible reply and body carry stay one living line.'
    const proactiveGapLine = 'proactive-gap=Need stronger long-run proof that visible proactive hold and subconscious carry stay unified after hover-first restraint survives detours.'
    const closureLine = 'closure=same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
    const bodyLine = 'body=Visible continuity still relies mainly on face, motion, and voice.'

    const result = buildPrioritizedProjectStateRewritePreserveLines({
      projectStateContinuityAnchors: [
        sameHerLine,
        holdLine,
        arcLine,
        cueLine,
        proactiveGapLine,
        phaseLine,
        landedLine,
        openLine,
        nextLine,
        closureLine,
        bodyLine,
        driftLine,
      ],
    })

    expect(result).toContain(driftLine)
    expect(result.indexOf(driftLine)).toBeLessThan(result.indexOf(phaseLine))
    expect(result).not.toContain(bodyLine)
  })
})
