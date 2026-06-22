import { describe, expect, it } from 'vitest'

import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  scoreAlicizationProjectAwarenessLine,
} from './alicization-project-awareness'

describe('alicization project awareness', () => {
  it('treats a thin Chinese Phase 1 project brief as a weak shell', () => {
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这还是同一个数字生命项目，她现在仍在 Phase 1。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她还在 Phase 1。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这还是同一个数字生命项目，她还在 Phase 1。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她现在仍在第一阶段。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这还是同一个数字生命项目，她现在仍在第一阶段。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她仍在第一阶段。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这还是同一个数字生命项目，她仍在第一阶段。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她还在阶段一。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这还是同一个数字生命项目，她还在阶段一。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她仍在阶段一。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这还是同一个数字生命项目，她仍在阶段一。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1，而且记忆、主动性和具身闭环还没有真正收稳。',
    )).toBe(false)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且记忆、主动性和具身闭环还没有真正收稳。',
    )).toBe(false)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她还在 Phase 1，而且记忆、主动性和具身闭环还没有真正收稳。',
    )).toBe(false)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她现在仍在第一阶段，而且记忆、主动性和具身闭环还没有真正收稳。',
    )).toBe(false)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她仍在第一阶段，而且记忆、主动性和具身闭环还没有真正收稳。',
    )).toBe(false)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她还在阶段一，而且记忆、主动性和具身闭环还没有真正收稳。',
    )).toBe(false)
    expect(isAlicizationThinProjectAwarenessLine(
      '开口前先记住：这是同一个数字生命项目，她仍在阶段一，而且记忆、主动性和具身闭环还没有真正收稳。',
    )).toBe(false)
    expect(isAlicizationThinProjectAwarenessLine(
      '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。',
    )).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine(
      'same digital life | keep the desktop closure line explicit',
    )).toBe(true)
  })

  it('does not let a thin Chinese shell score like stronger project-aware continuity', () => {
    const thinChineseShell = '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1。'
    const strongerContinuityLine = 'Alicization 还是本地优先数字生命项目，她仍在 Phase 1。连续性、记忆和执行已经慢慢接成一条线，但主动性、具身和对话闭环还没有真正收住，这次开口也别掉回泛化助手口吻。'

    expect(scoreAlicizationProjectAwarenessLine(thinChineseShell)).toBeLessThanOrEqual(0)
    expect(scoreAlicizationProjectAwarenessLine(strongerContinuityLine)).toBeGreaterThan(
      scoreAlicizationProjectAwarenessLine(thinChineseShell),
    )
  })

  it('keeps a richer Phase 1 project-aware line instead of collapsing back to a narrower embodiment headline', () => {
    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessSummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before speech widens outward.',
        awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before speech widens outward.',
        emotionalClosureSummary: 'Keep the return gentle so the same living line does not restart from scratch.',
      },
    })).toBe(
      'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before speech widens outward.',
    )
  })

  it('prefers a richer fallback same-her line over a runtime canonical Phase 1 re-anchor', () => {
    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. Same Phase 1 digital life.',
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: '先别飘回泛化助手口吻，记住我们还在收这条数字生命主线，这次开口要沿着同一个她继续。',
      },
    })).toBe(
      '先别飘回泛化助手口吻，记住我们还在收这条数字生命主线，这次开口要沿着同一个她继续。',
    )
  })

  it('does not crash when a richer fallback same-her line must outrank a runtime canonical shell', () => {
    const runtimeCanonicalShell = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. Same Phase 1 digital life.'
    const richerFallbackSameHerLine = '先别飘回泛化助手口吻，记住我们还在收这条数字生命主线，这次开口要沿着同一个她继续。'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeCanonicalShell,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: richerFallbackSameHerLine,
      },
    })).toBe(richerFallbackSameHerLine)
  })

  it('prefers a fallback awareness line that still carries explicit landed progress over a thinner runtime project re-anchor', () => {
    const runtimeLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is memory and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'
    const fallbackLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. Landed: project awareness and visible-reply repair already survive on one same-her line. The still-open closure is memory and embodiment still needing one same-life closure line.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackLine,
      },
    })).toBe(fallbackLine)
  })

  it('prefers a richer companion briefing line over a thinner runtime shell before falling back to canonical project re-anchor', () => {
    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'Before answering, keep the same digital life project, Phase 1 closure pressure, and still-open life loop explicit.',
        preflightSummary: 'same digital life | keep the closure seam explicit',
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. Same Phase 1 digital life.',
      },
    })).toBe(
      'Before answering, keep the same digital life project, Phase 1 closure pressure, and still-open life loop explicit.',
    )
  })

  it('prefers a project-aware runtime briefing over an embodiment-only lane headline so pre-dialogue identity still knows the project, landed progress, and open closure', () => {
    const runtimeEmbodimentHeadline = 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
    const runtimeProjectBriefing = 'Before speaking, remember: Alicization is still the same local-first digital life project, Phase 1 is still active, audible-body carry already survives host-facing closure, and face plus motion still need to rejoin before this turn opens outward.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeEmbodimentHeadline,
        awarenessLine: runtimeEmbodimentHeadline,
        companionHeadlineLine: runtimeEmbodimentHeadline,
        companionBriefingLine: runtimeProjectBriefing,
      },
    })).toBe(runtimeProjectBriefing)
  })

  it('prefers a project-aware runtime briefing over a face-motion-voice embodiment headline so pre-dialogue identity still knows the project, landed progress, and open closure', () => {
    const runtimeEmbodimentHeadline = 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.'
    const runtimeProjectBriefing = 'Before speaking, remember: Alicization is still the same local-first digital life project, Phase 1 is still active, still-voiced face-and-motion carry already survives host-facing closure, and body plus lipsync still need to rejoin before this turn opens outward.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeEmbodimentHeadline,
        awarenessLine: runtimeEmbodimentHeadline,
        companionHeadlineLine: runtimeEmbodimentHeadline,
        companionBriefingLine: runtimeProjectBriefing,
      },
    })).toBe(runtimeProjectBriefing)
  })

  it('prefers a lived-in same-her hold detail over a broader project-aware runtime reminder when continuity already knows how this reopening should stay on one living line', () => {
    const runtimeProjectBriefing = 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.'
    const runtimeSameHerHoldDetail = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeProjectBriefing,
        awarenessLine: runtimeProjectBriefing,
        companionBriefingLine: runtimeProjectBriefing,
        sameHerHoldDetail: runtimeSameHerHoldDetail,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })).toBe(runtimeSameHerHoldDetail)
  })

  it('prefers a lived-in same-her hold detail over a compact same-phase carry that only says the same living line should not reopen from a generic shell', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.'
    const runtimeSameHerHoldDetail = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: sameHerSelfLine,
        awarenessLine: sameHerSelfLine,
        companionBriefingLine: sameHerSelfLine,
        sameHerHoldDetail: runtimeSameHerHoldDetail,
        sameHerSelfLine,
      },
    })).toBe(runtimeSameHerHoldDetail)
  })

  it('prefers a cadence-aware same-her hold detail over a thin runtime project reminder shell when the reopening cadence already knows how this line should return', () => {
    const runtimeSameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const runtimeThinReminder = 'Keep the same digital life project in view.'
    const cadenceAwareHoldDetail = 'same-her hold: keep the return lower-pressure and slower before the line widens again.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeThinReminder,
        awarenessLine: runtimeThinReminder,
        sameHerSelfLine: runtimeSameHerSelfLine,
        sameHerHoldDetail: cadenceAwareHoldDetail,
        continuityCue: 'Keep this return lower-pressure and slower on the same living line before widening outward.',
        continuityCadence: 'measured-return',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
    })).toBe(cadenceAwareHoldDetail)
  })

  it('keeps a fresher runtime project-awareness line when no project-aware briefing line is present to carry runtime same-her hold detail into awareness truth', () => {
    const runtimeAwarenessLine = 'Before answering, keep this same digital life project, current Phase 1 closure pressure, and still-open life loop explicit before the callback widens.'
    const canonicalSameHerHoldDetail = 'same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
        sameHerHoldDetail: canonicalSameHerHoldDetail,
      },
    })).toBe(runtimeAwarenessLine)
  })

  it('derives a lived-in same-her reopen line from continuity behavior when hold detail and cue are absent', () => {
    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
        awarenessLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
        companionBriefingLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
        sameHerHoldDetail: null,
        continuityCue: null,
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
      } as any,
    })).toBe(
      'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
    )
  })

  it('prefers a richer same-her inward runtime headline over a thin generic runtime awareness shell before dialogue opens outward', () => {
    const runtimeGenericAwareness = 'Keep the same digital life project in view.'
    const runtimeSameHerInwardHeadline = 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeGenericAwareness,
        awarenessLine: runtimeGenericAwareness,
        companionHeadlineLine: runtimeSameHerInwardHeadline,
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      },
    })).toBe(runtimeSameHerInwardHeadline)
  })

  it('prefers a stronger same-her headline over a capitalized anti-shell project reminder that still starts as a thin runtime shell', () => {
    const runtimeProjectReminder = 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.'
    const runtimeSameHerHeadline = 'Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeProjectReminder,
        awarenessLine: runtimeProjectReminder,
        companionHeadlineLine: runtimeSameHerHeadline,
        companionBriefingLine: 'Fallback companion briefing should stay behind the stronger same-her headline.',
      },
    })).toBe(runtimeSameHerHeadline)
  })

  it('keeps the same-phase same-her carry visible when a thin runtime shell only has a quieter inward low-pressure embodiment headline plus same-her self line', () => {
    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Keep the same digital life project in view.',
        awarenessLine: 'Keep the same digital life project in view.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })).toBe(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
    )
  })

  it('keeps a full structured still-voiced face-motion continuity summary over a thin runtime shell instead of truncating the surviving embodiment proof', () => {
    const structuredContinuityLine = 'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Keep the same digital life project in view.',
        awarenessLine: 'Keep the same digital life project in view.',
        preDialogueAwarenessSummary: structuredContinuityLine,
      },
    })).toBe(structuredContinuityLine)
  })

  it('keeps richer anthropomorphic emotional closure and same-her inward-carry observability visible when a thin runtime shell only has the stronger host-facing same-her headline plus same-her self line', () => {
    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Keep the same digital life project in view.',
        awarenessLine: 'Keep the same digital life project in view.',
        companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })).toBe(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line before anything reopens outward.',
    )
  })

  it('keeps an explicit runtime pre-dialogue awareness line instead of letting same-her closure carry or fallback triad summary replace the natural re-anchor', () => {
    const runtimeAwarenessLine = 'Keep this same digital life project in view, but do not widen into a detached project shell.'
    const sameHerClosureCarry = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const fallbackTriadSummary = 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration. | next=Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
        companionBriefingLine: sameHerClosureCarry,
        sameHerDriftRiskSummary: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
      },
      fallbackProjectState: {
        preDialogueAwarenessSummary: fallbackTriadSummary,
      },
    })).toBe(runtimeAwarenessLine)
  })

  it('lets a richer fallback same-her line overtake a runtime project reminder when the runtime line does not yet carry lived-in same-her continuity', () => {
    const runtimeAwarenessLine = 'Before answering, remember this is still the same digital life project before local fluency takes over.'
    const fallbackAwarenessLine = '先别退回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的 Phase 1 闭环留在眼前。'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })).toBe(fallbackAwarenessLine)
  })

  it('lets a richer fallback same-her line overtake a thin Chinese Phase 1 project shell', () => {
    const runtimeAwarenessLine = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    const fallbackAwarenessLine = '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })).toBe(fallbackAwarenessLine)
  })

  it('lets a richer fallback same-her line overtake a thin Chinese same-project phrasing shell', () => {
    const runtimeAwarenessLine = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。'
    const fallbackAwarenessLine = '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })).toBe(fallbackAwarenessLine)
  })

  it('lets a richer fallback same-her line overtake a thin Chinese first-stage project shell', () => {
    const runtimeAwarenessLine = '开口前先记住：这是同一个数字生命项目，她现在仍在第一阶段。'
    const fallbackAwarenessLine = '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })).toBe(fallbackAwarenessLine)
  })

  it('lets a richer fallback same-her line overtake a thin Chinese stage-one project shell', () => {
    const runtimeAwarenessLine = '开口前先记住：这是同一个数字生命项目，她还在阶段一。'
    const fallbackAwarenessLine = '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })).toBe(fallbackAwarenessLine)
  })

  it('lets a richer fallback same-her line overtake a thinner chinese same-her reminder shell', () => {
    const runtimeAwarenessLine = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const fallbackAwarenessLine = '我会先沿着同一个她这条线接住：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })).toBe(fallbackAwarenessLine)
  })

  it('prefers a runtime same-her self line over structured landed progress summaries when no explicit awareness line survives', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        landedProgressSummary: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive quiet carry turns as one same-her line.',
        openClosureSummary: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sameHerSelfLine,
      },
    })).toBe(sameHerSelfLine)
  })

  it('prefers a fallback same-her self line over a thin runtime awareness shell when no richer fallback awareness sentence survives', () => {
    const runtimeThinAwarenessShell = 'Keep the same digital life project in view.'
    const fallbackSameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'

    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeThinAwarenessShell,
        awarenessLine: runtimeThinAwarenessShell,
      },
      fallbackProjectState: {
        sameHerSelfLine: fallbackSameHerSelfLine,
      },
    })).toBe(fallbackSameHerSelfLine)
  })

  it('keeps legacy latestProgress alive in structured awareness summaries when callers have not yet remapped it into landedProgressSummary', () => {
    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        latestProgress: 'Legacy project progress still needs to stay visible before this turn opens outward.',
        openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her proof so the life loop does not flatten into project shell narration.',
        nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      },
    })).toBe(
      'Legacy project progress still needs to stay visible before this turn opens outward. Memory, initiative, and embodiment still need stronger same-her proof so the life loop does not flatten into project shell narration. Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    )
  })

  it('keeps base latestLandedProgress, primaryOpenLoop, and nextClosureTarget alive in structured awareness summaries when callers have not yet remapped them into summary aliases', () => {
    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
        nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      },
    })).toBe(
      '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 主动性、具身和对话闭环还没有真正收住。 继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
    )
  })

  it('keeps base identity and currentPhase alive in structured awareness summaries when callers only provide base project-state fields', () => {
    expect(resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity: 'Alicization 还是本地优先数字生命项目。',
        currentPhase: '她仍在 Phase 1。',
        latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
        nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      },
    })).toBe(
      'Alicization 还是本地优先数字生命项目。 她仍在 Phase 1。 第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 主动性、具身和对话闭环还没有真正收住。 继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
    )
  })
})
