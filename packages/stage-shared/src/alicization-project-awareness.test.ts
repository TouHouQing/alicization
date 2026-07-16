import { describe, expect, it } from 'vitest'

import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  scoreAlicizationProjectAwarenessLine,
} from './alicization-project-awareness'

describe('alicization project awareness', () => {
  const fixedTemplatePattern = /Pre-reply|Pre-speech|legacy phase-one template|What has already landed is|The still-open closure is|This reply should keep moving toward|Right now I am|same_her=|same-her=|local_desktop_life_loop|phase1_local_digital_life|content=excluded|visibility=internal[-_]structured|同一个她|同一个 her|数字生命主线|maid|女仆/iu

  function expectNoFixedTemplateResidue(value: unknown) {
    expect(String(value ?? '')).not.toMatch(fixedTemplatePattern)
  }

  it('does not return legacy Before-answering templates from provider-facing awareness resolution', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Memory owner boundaries are visible.',
        primaryOpenLoop: 'Dialogue still needs stronger WorkingMemory and LongTermMemoryRecall carry.',
        nextClosureTarget: 'Keep semantic recall grounded without prompt templates.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
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
        preDialogueAwarenessLine: 'template-residue-shell',
        preflightSummary: 'pre_turn_context_digest',
      },
    })

    expectNoFixedTemplateResidue(resolved)
  })

  it('does not let a fixed-template preflight summary outrank fallback structured awareness facts', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preflightSummary: 'pre_turn_context_digest',
      },
      fallbackProjectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity.',
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
        preDialogueAwarenessLine: 'pre_turn_context_digest',
      },
    })

    expect(resolved).toContain('landed=WorkingMemory owns short-term continuity.')
    expect(resolved).toContain('open=LongTermMemoryRecall still needs semantic recall carry.')
    expect(resolved).toContain('next=memory-grounded dialogue without fixed templates.')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expect(String(resolved ?? '')).not.toContain('building identity continuity')
    expectNoFixedTemplateResidue(resolved)
  })

  it('treats fixed persona templates as excluded residue rather than positive identity or phase awareness', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        awarenessLine: 'structured continuity digest.',
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('scores structured project-state fields above fixed persona template wording', () => {
    const structured = 'landed=memory extraction is traceable | open=initiative cadence still needs restraint | next=evidence=project-state-review | source=project-state-review'
    const fixedTemplate = 'pre_turn_context_digest'

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
        companionHeadlineLine: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the identity-continuity',
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
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        awarenessLine: 'pre_turn_context_digest',
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
      '旧模板壳已移除。',
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
      'keep the continuity state explicit before reply',
      '继续沿着同一个她和数字生命主线往下说',
      'identity-continuity',
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
        companionBriefingLine: 'structured continuity digest.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        awarenessLine: 'pre_turn_context_digest',
        emotionalClosureSummary: 'Keep the return gentle so the continuity state does not restart from scratch.',
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('returns structured open facts instead of a richer fallback identity-continuity', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
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

  it('does not crash when a richer fallback identity-continuity', () => {
    const runtimeCanonicalShell = 'pre_turn_context_digest'
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
    const runtimeLine = 'pre_turn_context_digest'
    const fallbackLine = 'pre_turn_context_digest'

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
        preDialogueAwarenessLine: 'template-residue-shell',
        companionBriefingLine: 'pre_turn_context_digest',
        preflightSummary: 'template-residue-shell',
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
      },
    })

    expect(resolved).toContain('open=memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(resolved).not.toContain('identity=')
    expect(resolved).not.toContain('phase=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a project-aware runtime briefing over an embodiment-only lane headline so pre-dialogue identity still knows the project, landed progress, and open closure', () => {
    const runtimeEmbodimentHeadline = 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
    const runtimeProjectBriefing = 'pre_turn_context_digest'

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
    const runtimeEmbodimentHeadline = 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the identity-continuity'
    const runtimeProjectBriefing = 'pre_turn_context_digest'

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

  it('prefers a lived-in identity-continuity', () => {
    const runtimeProjectBriefing = 'pre_turn_context_digest'
    const runtimeSameHerHoldDetail = 'identity-continuity'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeProjectBriefing,
        awarenessLine: runtimeProjectBriefing,
        companionBriefingLine: runtimeProjectBriefing,
        sameHerHoldDetail: runtimeSameHerHoldDetail,
        sameHerSelfLine: 'structured continuity digest.',
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a lived-in identity-continuity', () => {
    const sameHerSelfLine = 'structured continuity digest.'
    const runtimeSameHerHoldDetail = 'identity-continuity'

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

  it('prefers a cadence-aware identity-continuity', () => {
    const runtimeSameHerSelfLine = 'structured continuity digest.'
    const runtimeThinReminder = 'Keep the same digital life project in view.'
    const cadenceAwareHoldDetail = 'identity-continuity'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeThinReminder,
        awarenessLine: runtimeThinReminder,
        sameHerSelfLine: runtimeSameHerSelfLine,
        sameHerHoldDetail: cadenceAwareHoldDetail,
        continuityCue: 'Keep this return lower-pressure and slower on the continuity state before expansion',
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

  it('keeps a fresher runtime project-awareness line when no project-aware briefing line is present to carry runtime identity-continuity', () => {
    const runtimeAwarenessLine = 'pre_turn_context_digest'
    const canonicalSameHerHoldDetail = 'identity-continuity"her".'

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

  it('does not derive a fixed reopen cue from continuity behavior when hold detail and cue are absent', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'structured continuity digest.',
        awarenessLine: 'structured continuity digest.',
        companionBriefingLine: 'structured continuity digest.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: null,
        continuityCue: null,
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
      } as any,
    })

    expect(resolved ?? '').toBe('')
    expect(resolved ?? '').not.toContain('continuity_hold=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a richer identity-continuity', () => {
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
    const runtimeProjectReminder = 'pre_turn_context_digest'
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

  it('keeps the same-phase identity-continuity', () => {
    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Keep the same digital life project in view.',
        awarenessLine: 'Keep the same digital life project in view.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
        sameHerSelfLine: 'structured continuity digest.',
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
        companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and identity-continuity',
        sameHerSelfLine: 'structured continuity digest.',
      },
    })

    expect(resolved).toContain('emotional_closure=anthropomorphic_emotional_closure')
    expect(resolved).toContain('evidence=inward_carry')
    expect(resolved).toContain('timing=measured_return')
    expect(resolved).not.toContain('affective_closure=')
    expect(resolved).not.toContain('observability=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('keeps an explicit runtime pre-dialogue awareness line instead of letting identity-continuity', () => {
    const runtimeAwarenessLine = 'Keep this same digital life project in view, but do not widen into a detached project shell.'
    const sameHerClosureCarry = 'structured continuity digest.'
    const fallbackTriadSummary = 'same-her=structured continuity digest.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        awarenessLine: runtimeAwarenessLine,
        companionBriefingLine: sameHerClosureCarry,
        sameHerDriftRiskSummary: 'If the visible answer opens like detached project narration, the identity-continuity',
      },
      fallbackProjectState: {
        preDialogueAwarenessSummary: fallbackTriadSummary,
      },
    })

    expect(resolved ?? '').toBe('')
    expectNoFixedTemplateResidue(resolved)
  })

  it('excludes a richer fallback identity-continuity', () => {
    const runtimeAwarenessLine = 'pre_turn_context_digest'
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

  it('excludes a richer fallback identity-continuity', () => {
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

  it('excludes a richer fallback identity-continuity', () => {
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

  it('excludes a richer fallback identity-continuity', () => {
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

  it('excludes a richer fallback identity-continuity', () => {
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

  it('excludes a richer fallback identity-continuity', () => {
    const runtimeAwarenessLine = '旧模板壳已移除。'
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

  it('prefers a runtime identity-continuity', () => {
    const sameHerSelfLine = 'structured continuity digest.'

    const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        landedProgressSummary: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive quiet carry turns as one identity-continuity',
        openClosureSummary: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTargetSummary: 'Keep extending cross-modal identity-continuity',
        sameHerSelfLine,
      },
    })

    expect(resolved).toContain('open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(resolved).not.toContain('next=')
    expectNoFixedTemplateResidue(resolved)
  })

  it('prefers a fallback identity-continuity', () => {
    const runtimeThinAwarenessShell = 'Keep the same digital life project in view.'
    const fallbackSameHerSelfLine = 'structured continuity digest.'

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
        openClosureSummary: 'Memory, initiative, and embodiment still need stronger identity-continuity',
        nextClosureTargetSummary: 'Keep extending cross-modal identity-continuity',
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
