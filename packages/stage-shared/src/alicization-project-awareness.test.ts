import { describe, expect, it } from 'vitest'

import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  scoreAlicizationProjectAwarenessLine,
} from './alicization-project-awareness'

describe('alicization project awareness', () => {
  const fixedTemplatePattern = /Before answering|Before speaking|Same Phase 1 digital life|What has already landed is|The still-open closure is|This reply should keep moving toward|Right now I am|same_her=|same-her=|local_desktop_life_loop|phase1_local_digital_life|content=excluded|visibility=internal[-_]structured|同一个她|同一个 her|数字生命主线|maid|女仆/iu

  function expectNoFixedTemplateResidue(value: unknown) {
    expect(String(value ?? '')).not.toMatch(fixedTemplatePattern)
  }

  it('does not return legacy Before-answering templates from provider-facing awareness resolution', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her".',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Memory owner boundaries are visible.',
        primaryOpenLoop: 'Dialogue still needs stronger WorkingMemory and LongTermMemoryRecall carry.',
        nextClosureTarget: 'Keep semantic recall grounded without prompt templates.',
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. What has already landed is memory owner boundaries. The still-open closure is dialogue recall. This reply should keep moving toward semantic recall.',
      },
    })

    expect(resolved).toContain('landed=Memory owner boundaries are visible.')
    expect(resolved).toContain('open=Dialogue still needs stronger WorkingMemory and LongTermMemoryRecall carry.')
    expect(resolved).toContain('next=Keep semantic recall grounded without prompt templates.')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('does not preserve a Before-answering preflight summary as provider-facing awareness text', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        preflightSummary: 'Before answering, use current memory evidence and keep the response grounded in the present turn.',
      },
    })

    expectNoFixedTemplateResidue(resolved)
  })

  it('does not let a fixed-template preflight summary outrank fallback structured awareness facts', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preflightSummary: 'Before answering, use current memory evidence and keep the response grounded in the present turn.',
      },
      fallbackProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her".',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project awareness cleanup is underway.',
        primaryOpenLoop: 'Fixed preflight templates must not become provider-facing awareness.',
      },
    })

    expect(resolved).toContain('landed=Project awareness cleanup is underway.')
    expect(String(resolved ?? '')).not.toContain('status=content-excluded')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('migrates legacy project-awareness shells into structured tokens without restating the persona template', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. What has already landed is WorkingMemory owns short-term continuity. The still-open closure is LongTermMemoryRecall still needs semantic recall carry. This reply should keep moving toward memory-grounded dialogue without fixed templates.',
      },
    })

    expect(resolved).toContain('landed=WorkingMemory owns short-term continuity.')
    expect(resolved).toContain('open=LongTermMemoryRecall still needs semantic recall carry.')
    expect(resolved).toContain('next=memory-grounded dialogue without fixed templates.')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expect(String(resolved ?? '')).not.toContain('building one continuous "her"')
    expectNoFixedTemplateResidue(resolved)
  })

  it('treats fixed persona templates as excluded residue rather than positive identity or phase awareness', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life.',
        awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('scores structured project-state fields above fixed persona template wording', () => {
    const structured = 'landed=memory extraction is traceable | open=initiative cadence still needs restraint | next=evidence=project-state-review | source=project-state-review'
    const fixedTemplate = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life.'

    expect(scoreAlicizationProjectAwarenessLine(structured)).toBeGreaterThan(0)
    expect(scoreAlicizationProjectAwarenessLine(fixedTemplate)).toBeLessThan(
      scoreAlicizationProjectAwarenessLine(structured),
    )
  })

  it('returns structured embodiment facts instead of legacy Right-now companion headlines', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Keep the same digital life project in view.',
        awarenessLine: 'Keep the same digital life project in view.',
        companionHeadlineLine: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      },
    })

    expect(resolved).toContain('embodiment_lanes=motion+voice')
    expect(resolved).toContain('missing_lanes=body+face+lipsync')
    expect(resolved).toContain('status=partial')
    expect(resolved).not.toContain('continuity=embodiment')
    expect(resolved).not.toContain('visibility=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('does not return fallback same-her prose templates when the runtime shell is weak', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
        awarenessLine: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。',
        awarenessLine: '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。',
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

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

  it('does not score raw continuity template phrases as positive project-awareness evidence', () => {
    const structuredEvidence = 'embodiment_lanes=body+lipsync+voice | source=runtime-audit | trace=turn-42 | status=partial'
    for (const templatePhrase of [
      'keep the same living line explicit before answering',
      '继续沿着同一个她和数字生命主线往下说',
      'same-her continuity should stay on one continuous her line',
      'Alicization is a local-first digital life project and should not become a project shell',
    ]) {
      expect(scoreAlicizationProjectAwarenessLine(templatePhrase)).toBeLessThanOrEqual(0)
      expect(scoreAlicizationProjectAwarenessLine(templatePhrase)).toBeLessThan(
        scoreAlicizationProjectAwarenessLine(structuredEvidence),
      )
    }
  })

  it('keeps a richer Phase 1 project-aware line instead of collapsing back to a narrower embodiment headline', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessSummary: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before speech widens outward.',
        awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before speech widens outward.',
        emotionalClosureSummary: 'Keep the return gentle so the same living line does not restart from scratch.',
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('returns structured open facts instead of a richer fallback same-her line over a runtime canonical Phase 1 re-anchor', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. Same Phase 1 digital life.',
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: '先别飘回泛化助手口吻，记住我们还在收这条数字生命主线，这次开口要沿着同一个她继续。',
      },
    })

    expect(resolved).toContain('open=memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('does not crash when a richer fallback same-her line must be excluded behind structured open facts', () => {
    const runtimeCanonicalShell = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. Same Phase 1 digital life.'
    const richerFallbackSameHerLine = '先别飘回泛化助手口吻，记住我们还在收这条数字生命主线，这次开口要沿着同一个她继续。'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeCanonicalShell,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: richerFallbackSameHerLine,
      },
    })

    expect(resolved).toContain('open=memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a fallback awareness line that still carries explicit landed progress over a thinner runtime project re-anchor', () => {
    const runtimeLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is memory and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'
    const fallbackLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. Landed: project awareness and visible-reply repair already survive on one same-her line. The still-open closure is memory and embodiment still needing one same-life closure line.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackLine,
      },
    })

    expect(resolved).toContain('open=memory and embodiment still needing one same-life closure line.')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expect(resolved).not.toContain('landed=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a richer companion briefing line over a thinner runtime shell before falling back to canonical project re-anchor', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'Before answering, keep the same digital life project, Phase 1 closure pressure, and still-open life loop explicit.',
        preflightSummary: 'same digital life | keep the closure seam explicit',
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. Same Phase 1 digital life.',
      },
    })

    expect(resolved).toContain('open=memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a project-aware runtime briefing over an embodiment-only lane headline so pre-dialogue identity still knows the project, landed progress, and open closure', () => {
    const runtimeEmbodimentHeadline = 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
    const runtimeProjectBriefing = 'Before speaking, remember: Alicization is still the same local-first digital life project, Phase 1 is still active, audible-body carry already survives host-facing closure, and face plus motion still need to rejoin before this turn opens outward.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeEmbodimentHeadline,
        awarenessLine: runtimeEmbodimentHeadline,
        companionHeadlineLine: runtimeEmbodimentHeadline,
        companionBriefingLine: runtimeProjectBriefing,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a project-aware runtime briefing over a face-motion-voice embodiment headline so pre-dialogue identity still knows the project, landed progress, and open closure', () => {
    const runtimeEmbodimentHeadline = 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.'
    const runtimeProjectBriefing = 'Before speaking, remember: Alicization is still the same local-first digital life project, Phase 1 is still active, still-voiced face-and-motion carry already survives host-facing closure, and body plus lipsync still need to rejoin before this turn opens outward.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeEmbodimentHeadline,
        awarenessLine: runtimeEmbodimentHeadline,
        companionHeadlineLine: runtimeEmbodimentHeadline,
        companionBriefingLine: runtimeProjectBriefing,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a lived-in same-her hold detail over a broader project-aware runtime reminder when continuity already knows how this reopening should stay on one living line', () => {
    const runtimeProjectBriefing = 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.'
    const runtimeSameHerHoldDetail = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeProjectBriefing,
        awarenessLine: runtimeProjectBriefing,
        companionBriefingLine: runtimeProjectBriefing,
        sameHerHoldDetail: runtimeSameHerHoldDetail,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a lived-in same-her hold detail over a compact same-phase carry that only says the same living line should not reopen from a generic shell', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.'
    const runtimeSameHerHoldDetail = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: sameHerSelfLine,
        awarenessLine: sameHerSelfLine,
        companionBriefingLine: sameHerSelfLine,
        sameHerHoldDetail: runtimeSameHerHoldDetail,
        sameHerSelfLine,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a cadence-aware same-her hold detail over a thin runtime project reminder shell when the reopening cadence already knows how this line should return', () => {
    const runtimeSameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const runtimeThinReminder = 'Keep the same digital life project in view.'
    const cadenceAwareHoldDetail = 'same-her hold: keep the return lower-pressure and slower before the line widens again.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
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
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('keeps a fresher runtime project-awareness line when no project-aware briefing line is present to carry runtime same-her hold detail into awareness truth', () => {
    const runtimeAwarenessLine = 'Before answering, keep this same digital life project, current Phase 1 closure pressure, and still-open life loop explicit before the callback widens.'
    const canonicalSameHerHoldDetail = 'same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
        sameHerHoldDetail: canonicalSameHerHoldDetail,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('derives a lived-in same-her reopen line from continuity behavior when hold detail and cue are absent', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
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
    })

    expect(resolved).toContain('continuity_hold=repair_before_closeness; timing=before_closeness_widens')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a richer same-her inward runtime headline over a thin generic runtime awareness shell before dialogue opens outward', () => {
    const runtimeGenericAwareness = 'Keep the same digital life project in view.'
    const runtimeSameHerInwardHeadline = 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeGenericAwareness,
        awarenessLine: runtimeGenericAwareness,
        companionHeadlineLine: runtimeSameHerInwardHeadline,
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      },
    })

    expect(resolved).toContain('embodiment_lanes=body+face+motion')
    expect(resolved).toContain('missing_lanes=lipsync+voice')
    expect(resolved).toContain('status=partial')
    expect(resolved).not.toContain('continuity=embodiment')
    expect(resolved).not.toContain('pending_rejoin=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a stronger same-her headline over a capitalized anti-shell project reminder that still starts as a thin runtime shell', () => {
    const runtimeProjectReminder = 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.'
    const runtimeSameHerHeadline = 'Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeProjectReminder,
        awarenessLine: runtimeProjectReminder,
        companionHeadlineLine: runtimeSameHerHeadline,
        companionBriefingLine: 'Fallback companion briefing should stay behind the stronger same-her headline.',
      },
    })

    expect(resolved).toContain('embodiment_lanes=face+motion+voice')
    expect(resolved).toContain('status=closed')
    expect(resolved).not.toContain('continuity=embodiment')
    expectNoFixedTemplateResidue(resolved)
  })

  it('keeps the same-phase same-her carry visible when a thin runtime shell only has a quieter inward low-pressure embodiment headline plus same-her self line', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Keep the same digital life project in view.',
        awarenessLine: 'Keep the same digital life project in view.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(resolved).toContain('embodiment_lanes=body+face+motion')
    expect(resolved).toContain('missing_lanes=lipsync+voice')
    expect(resolved).not.toContain('continuity=embodiment')
    expect(resolved).not.toContain('pending_rejoin=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('keeps a full structured still-voiced face-motion continuity summary over a thin runtime shell instead of truncating the surviving embodiment proof', () => {
    const structuredContinuityLine = 'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Keep the same digital life project in view.',
        awarenessLine: 'Keep the same digital life project in view.',
        preDialogueAwarenessSummary: structuredContinuityLine,
      },
    })

    expect(resolved).toContain('embodiment_lanes=face+motion')
    expect(resolved).toContain('missing_lanes=body+lipsync+voice')
    expect(resolved).toContain('status=partial')
    expect(resolved).not.toContain('continuity=embodiment')
    expect(resolved).not.toContain('pending-rejoin=')
  })

  it('keeps richer anthropomorphic emotional closure and inward continuity observability visible when a thin runtime shell only has the stronger host-facing headline plus self line', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Keep the same digital life project in view.',
        awarenessLine: 'Keep the same digital life project in view.',
        companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(resolved).toContain('emotional_closure=anthropomorphic_emotional_closure')
    expect(resolved).toContain('evidence=inward_carry')
    expect(resolved).toContain('timing=measured_return')
    expect(resolved).not.toContain('affective_closure=')
    expect(resolved).not.toContain('observability=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('keeps an explicit runtime pre-dialogue awareness line instead of letting same-her closure carry or fallback triad summary replace the natural re-anchor', () => {
    const runtimeAwarenessLine = 'Keep this same digital life project in view, but do not widen into a detached project shell.'
    const sameHerClosureCarry = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const fallbackTriadSummary = 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration. | next=Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
        companionBriefingLine: sameHerClosureCarry,
        sameHerDriftRiskSummary: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
      },
      fallbackProjectState: {
        preDialogueAwarenessSummary: fallbackTriadSummary,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('excludes a richer fallback same-her line when the runtime line does not yet carry structured continuity', () => {
    const runtimeAwarenessLine = 'Before answering, remember this is still the same digital life project before local fluency takes over.'
    const fallbackAwarenessLine = '先别退回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的 Phase 1 闭环留在眼前。'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('excludes a richer fallback same-her line behind a thin Chinese Phase 1 project shell', () => {
    const runtimeAwarenessLine = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    const fallbackAwarenessLine = '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('excludes a richer fallback same-her line behind a thin Chinese same-project phrasing shell', () => {
    const runtimeAwarenessLine = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。'
    const fallbackAwarenessLine = '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('excludes a richer fallback same-her line behind a thin Chinese first-stage project shell', () => {
    const runtimeAwarenessLine = '开口前先记住：这是同一个数字生命项目，她现在仍在第一阶段。'
    const fallbackAwarenessLine = '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('excludes a richer fallback same-her line behind a thin Chinese stage-one project shell', () => {
    const runtimeAwarenessLine = '开口前先记住：这是同一个数字生命项目，她还在阶段一。'
    const fallbackAwarenessLine = '先别飘回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的记忆、主动性和具身闭环留在眼前。'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('excludes a richer fallback same-her line behind a thinner chinese same-her reminder shell', () => {
    const runtimeAwarenessLine = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const fallbackAwarenessLine = '我会先沿着同一个她这条线接住：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a runtime same-her self line over structured landed progress summaries when no explicit awareness line survives', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        landedProgressSummary: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive quiet carry turns as one same-her line.',
        openClosureSummary: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sameHerSelfLine,
      },
    })

    expect(resolved).toContain('open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(resolved).not.toContain('next=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a fallback same-her self line over a thin runtime awareness shell when no richer fallback awareness sentence survives', () => {
    const runtimeThinAwarenessShell = 'Keep the same digital life project in view.'
    const fallbackSameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeThinAwarenessShell,
        awarenessLine: runtimeThinAwarenessShell,
      },
      fallbackProjectState: {
        sameHerSelfLine: fallbackSameHerSelfLine,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('keeps legacy latestProgress alive in structured awareness summaries when callers have not yet remapped it into landedProgressSummary', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        latestProgress: 'Legacy project progress still needs to stay visible before this turn opens outward.',
        openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her proof so the life loop does not flatten into project shell narration.',
        nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      },
    })

    expect(resolved).toContain('landed=Legacy project progress still needs to stay visible before this turn opens outward.')
    expect(resolved).not.toContain('open=')
    expect(resolved).not.toContain('next=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('keeps base latestLandedProgress, primaryOpenLoop, and nextClosureTarget alive in structured awareness summaries when callers have not yet remapped them into summary aliases', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
        nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      },
    })

    expect(resolved).toContain('landed=第一阶段已经把连续性、记忆和执行慢慢接成一条线了。')
    expect(resolved).toContain('open=主动性、具身和对话闭环还没有真正收住。')
    expect(resolved).not.toContain('next=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('keeps base identity and currentPhase alive as structured anchors when callers only provide base project-state fields', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity: 'Alicization 还是本地优先数字生命项目。',
        currentPhase: '她仍在 Phase 1。',
        latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
        primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
        nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
      },
    })

    expect(resolved).toContain('landed=第一阶段已经把连续性、记忆和执行慢慢接成一条线了。')
    expect(resolved).toContain('open=主动性、具身和对话闭环还没有真正收住。')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expect(resolved).not.toContain('next=')
    expectNoFixedTemplateResidue(resolved)
  })
})
