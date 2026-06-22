import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'

describe('structured project state', () => {
  it('keeps canonical same-her drift risk when rebuilding host-visible project state', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()

    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'thin identity',
        currentPhase: 'thin phase',
        latestLandedProgress: 'thin landed',
        primaryOpenLoop: 'thin open',
        nextClosureTarget: 'thin next',
        sameHerSelfLine: 'thin same-her',
      },
      runtimePreflightSummary: 'runtime preflight',
      payloadPreDialogueAwarenessLine: 'payload awareness',
    })

    expect(rebuilt.identity).toBe('thin identity')
    expect(rebuilt.currentPhase).toBe('thin phase')
    expect(rebuilt.latestLandedProgress).toBe('thin landed')
    expect(rebuilt.primaryOpenLoop).toBe('thin open')
    expect(rebuilt.nextClosureTarget).toBe('thin next')
    expect(rebuilt.sameHerSelfLine).toBe('thin same-her')
    expect(rebuilt.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
  })

  it('prefers explicit same-her drift risk when a richer structured payload already carries it', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        sameHerDriftRisk: 'Do not let this reply collapse into a detached project shell.',
      },
    })

    expect(rebuilt.sameHerDriftRisk).toBe(
      'Do not let this reply collapse into a detached project shell.',
    )
  })

  it('preserves richer same-her continuity carry fields when rebuilding structured project state', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        companionBriefingLine: 'Before answering, keep the same digital life project in view.',
        emotionalClosureSummary: 'Emotional closure is still half-settled, so the return should stay gentle instead of reopening from scratch.',
        continuityRestraint: 'measured-return',
        continuityArcStage: 'return-side-follow-through',
        continuityCue: 'same living line: keep carrying the already-landed closure forward.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'linger-then-rejoin',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
    })

    expect(rebuilt.companionBriefingLine).toBe('Before answering, keep the same digital life project in view.')
    expect(rebuilt.emotionalClosureSummary).toBe('Emotional closure is still half-settled, so the return should stay gentle instead of reopening from scratch.')
    expect(rebuilt.continuityRestraint).toBe('measured-return')
    expect(rebuilt.continuityArcStage).toBe('return-side-follow-through')
    expect(rebuilt.continuityCue).toBe('same living line: keep carrying the already-landed closure forward.')
    expect(rebuilt.continuityPreferredTiming).toBe('next-open-window')
    expect(rebuilt.continuityCadence).toBe('linger-then-rejoin')
    expect(rebuilt.preferredBlinkCadence).toBe('quiet')
    expect(rebuilt.preferredGazeMode).toBe('soften')
    expect(rebuilt.preferredPauseMode).toBe('longer')
    expect(rebuilt.preferredLipsyncMode).toBe('restrained')
    expect(rebuilt.preferredVoiceMode).toBe('lower-pressure')
    expect(rebuilt.preferredPacingMode).toBe('slower')
  })

  it('prefers a stronger lived-in runtime awareness line over generic canonical project awareness fallback', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is still one local-first digital life.',
      },
      runtimePreferredAwarenessLine:
        'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      runtimePreDialogueAwarenessLine:
        'Before answering, keep this same digital life project in view.',
      payloadPreDialogueAwarenessLine:
        'Before answering, remember the project.',
    })

    expect(rebuilt.preDialogueAwarenessLine).toBe(
      'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
    )
  })

  it('prefers a stronger same-her companion headline over a thinner structured awareness line while keeping the stale briefing line out of the rebuilt awareness', () => {
    const strongerCompanionHeadlineLine
      = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is still one local-first digital life.',
        companionHeadlineLine: strongerCompanionHeadlineLine,
        companionBriefingLine: 'Before answering, keep the same digital life project in view.',
      },
      runtimePreferredAwarenessLine: 'Before answering, keep the same digital life project in view.',
      runtimePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
      payloadPreDialogueAwarenessLine: 'Before answering, remember the project.',
    })

    expect(rebuilt.preDialogueAwarenessLine).toBe(strongerCompanionHeadlineLine)
    expect(rebuilt.preDialogueAwarenessSummary).toBe(strongerCompanionHeadlineLine)
    expect(rebuilt.awarenessLine).toBe(strongerCompanionHeadlineLine)
    expect(rebuilt.companionHeadlineLine).toBe(strongerCompanionHeadlineLine)
    expect(rebuilt.companionBriefingLine).toBe('Before answering, keep the same digital life project in view.')
  })

  it('re-canonicalizes thin preflight shells when rebuilding structured project state for return-side continuity', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project',
        currentPhase: 'Phase 1: Local Digital Life',
      },
      runtimePreflightSummary: 'same digital life | landed | open closure',
      runtimePreferredAwarenessLine: 'Before answering, keep the same digital life project in view.',
      runtimePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
      payloadPreDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
    })

    expect(rebuilt.preflightSummary).not.toBe('same digital life | landed | open closure')
    expect(rebuilt.preflightSummary).toContain('Alicization is a local-first digital life project')
    expect(rebuilt.preflightSummary).toContain('Phase 1: Local Digital Life')
    expect(rebuilt.preflightSummary).toContain('open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(rebuilt.preflightSummary).toContain('next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
  })

  it('reconstructs richer phase-1 landed open and next awareness from thin shells when stronger structured closure fields already exist', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Ordinary continuation turns, returned runtime project-state carry, answer-planner same-her continuity, settlement audit carry, and rewrite guidance carry now survive together.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.',
        nextClosureTarget: 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      runtimePreflightSummary: 'same digital life | landed | open closure',
      runtimePreferredAwarenessLine: 'Before answering, keep the same digital life project in view.',
      runtimePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
      payloadPreDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
    })

    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('Before answering, remember:')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('What has already landed is')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('The still-open closure is')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('This reply should keep moving toward')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('Ordinary continuation turns')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('memory, initiative, and embodiment still need one tighter same-her closure seam')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('settlement audit carry')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('before local detail takes over')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '').length).toBeLessThanOrEqual(700)
    expect(rebuilt.preDialogueAwarenessSummary).toBe(rebuilt.preDialogueAwarenessLine)
    expect(rebuilt.awarenessLine).toBe(rebuilt.preDialogueAwarenessLine)
  })

  it('reconstructs structured awareness from legacy latestProgress when latestLandedProgress is absent', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: 'Legacy-only structured return marker already lands before visible reply shaping.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.',
        nextClosureTarget: 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      runtimePreflightSummary: 'same digital life | landed | open closure',
      runtimePreferredAwarenessLine: 'Before answering, keep the same digital life project in view.',
      runtimePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
      payloadPreDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
    })

    expect(rebuilt.latestLandedProgress).toBe('Legacy-only structured return marker already lands before visible reply shaping.')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('What has already landed is Legacy-only structured return marker already lands before visible reply shaping')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('Runtime-owned proactive initiative')
  })

  it('does not rebuild a canonical awareness line back into older continuity-only landed progress when the current awareness already carries richer governance progress', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const governanceAwareAwarenessLine = [
      'Before answering, remember: Alicization is still the same local-first digital life project.',
      'She is still inside Phase 1: Local Digital Life.',
      'What has already landed is pre-dialogue transport is explicit entrypoint governance mirrored into chat-entry governance.',
      'The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      'This reply should keep moving toward Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    ].join(' ')
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: canonicalProjectState.identity,
        currentPhase: canonicalProjectState.currentPhase,
        latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
        primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
        nextClosureTarget: canonicalProjectState.nextClosureTarget,
        sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
        sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
      },
      runtimePreflightSummary: canonicalProjectState.preflightSummary ?? null,
      runtimePreDialogueAwarenessLine: governanceAwareAwarenessLine,
    })

    expect(rebuilt.preDialogueAwarenessLine).toContain('pre-dialogue transport')
    expect(rebuilt.preDialogueAwarenessLine).toContain('entrypoint governance')
    expect(rebuilt.preDialogueAwarenessLine).toContain('mirrored into chat-entry governance')
    expect(rebuilt.preDialogueAwarenessLine).not.toContain('repeated next-turn carry')
  })

  it('preserves richer normalized project-state awareness when runtime and payload shells are thinner', () => {
    const richerNormalizedAwarenessLine = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。已经落地的是桌面返场开始能带回同一条 same-her life line，但记忆、主动性和具身之间还没有彻底闭环，下一步还得继续把这些 closure 收成一个 living line。'
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessSummary: richerNormalizedAwarenessLine,
        preDialogueAwarenessLine: richerNormalizedAwarenessLine,
        awarenessLine: richerNormalizedAwarenessLine,
      },
      runtimePreferredAwarenessLine: 'Before answering, keep the same digital life project in view.',
      runtimePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
      payloadPreDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
    })

    expect(rebuilt.preDialogueAwarenessSummary).toBe(richerNormalizedAwarenessLine)
    expect(rebuilt.preDialogueAwarenessLine).toBe(richerNormalizedAwarenessLine)
    expect(rebuilt.awarenessLine).toBe(richerNormalizedAwarenessLine)
  })

  it('rebuilds stronger structured awareness from thin Chinese phase-1 reminder shells when closure fields already carry the richer same-her line', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Ordinary continuation turns, returned runtime project-state carry, answer-planner same-her continuity, settlement audit carry, and rewrite guidance carry now survive together.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.',
        nextClosureTarget: 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      runtimePreferredAwarenessLine: '开口前先记住：这是同一个数字生命项目，她还在阶段一。',
      runtimePreDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在第一阶段。',
      payloadPreDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1。',
    })

    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('Before answering, remember:')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('What has already landed is')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('The still-open closure is')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('This reply should keep moving toward')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('Ordinary continuation turns')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('memory, initiative, and embodiment still need one tighter same-her closure seam')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('开口前先记住：这是同一个数字生命项目，她还在阶段一。')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('开口前先记住：这是同一个数字生命项目，她仍在第一阶段。')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('开口前先记住：这是同一个数字生命项目，她仍在 Phase 1。')
    expect(rebuilt.preDialogueAwarenessSummary).toBe(rebuilt.preDialogueAwarenessLine)
    expect(rebuilt.awarenessLine).toBe(rebuilt.preDialogueAwarenessLine)
  })

  it('rebuilds stronger structured awareness from thin Chinese same-project phrasing shells when closure fields already carry the richer same-her line', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Ordinary continuation turns, returned runtime project-state carry, answer-planner same-her continuity, settlement audit carry, and rewrite guidance carry now survive together.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.',
        nextClosureTarget: 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      runtimePreferredAwarenessLine: '开口前先记住：这还是同一个数字生命项目，她还在阶段一。',
      runtimePreDialogueAwarenessLine: '开口前先记住：这还是同一个数字生命项目，她仍在第一阶段。',
      payloadPreDialogueAwarenessLine: '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。',
    })

    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('Before answering, remember:')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('What has already landed is')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('The still-open closure is')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('This reply should keep moving toward')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('Ordinary continuation turns')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).toContain('memory, initiative, and embodiment still need one tighter same-her closure seam')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('开口前先记住：这还是同一个数字生命项目，她还在阶段一。')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('开口前先记住：这还是同一个数字生命项目，她仍在第一阶段。')
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。')
    expect(rebuilt.preDialogueAwarenessSummary).toBe(rebuilt.preDialogueAwarenessLine)
    expect(rebuilt.awarenessLine).toBe(rebuilt.preDialogueAwarenessLine)
  })

  it('prefers the stronger audible-body companion headline over thinner runtime awareness shells', () => {
    const strongerCompanionHeadlineLine
      = 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is still one local-first digital life.',
        companionHeadlineLine: strongerCompanionHeadlineLine,
        companionBriefingLine: 'Before answering, keep the same digital life project in view.',
      },
      runtimePreferredAwarenessLine: 'Before answering, keep the same digital life project in view.',
      runtimePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
      payloadPreDialogueAwarenessLine: 'Before answering, remember the project.',
    })

    expect(rebuilt.preDialogueAwarenessLine).toBe(strongerCompanionHeadlineLine)
    expect(rebuilt.preDialogueAwarenessSummary).toBe(strongerCompanionHeadlineLine)
    expect(rebuilt.awarenessLine).toBe(strongerCompanionHeadlineLine)
    expect(rebuilt.companionHeadlineLine).toBe(strongerCompanionHeadlineLine)
    expect(rebuilt.companionBriefingLine).toBe('Before answering, keep the same digital life project in view.')
  })

  it('keeps callback-specific same-her project awareness instead of rebuilding it into a broader canonical reminder when neighboring shells are thin', () => {
    const callbackAwarenessLine = 'Before answering, remember this callback still belongs to one same Phase 1 digital life, and the unfinished closure seam still belongs to her while this return keeps carrying the same closure line forward.'
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessSummary: callbackAwarenessLine,
        preDialogueAwarenessLine: callbackAwarenessLine,
        awarenessLine: callbackAwarenessLine,
        latestLandedProgress: 'Same-her callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.',
        primaryOpenLoop: 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.',
        nextClosureTarget: 'Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.',
        sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
      },
      runtimePreferredAwarenessLine: 'Before answering, keep the same digital life project in view.',
      runtimePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
      payloadPreDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
    })

    expect(rebuilt.preDialogueAwarenessSummary).toBe(callbackAwarenessLine)
    expect(rebuilt.preDialogueAwarenessLine).toBe(callbackAwarenessLine)
    expect(rebuilt.awarenessLine).toBe(callbackAwarenessLine)
    expect(String(rebuilt.preDialogueAwarenessLine ?? '')).not.toContain('Before answering, remember: Alicization is a local-first digital life project')
  })

  it('rebuilds repair-before-closeness same-her awareness carry from continuity restraint when hold detail and cue are missing', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry and callback continuity already survive execution re-entry.',
        primaryOpenLoop: 'Repair-first callback continuity still needs to stay on one same living line before execution opens outward again.',
        nextClosureTarget: 'Keep the same callback repair seam explicit through execution re-entry before broader fluency takes over.',
        sameHerSelfLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
        sameHerDriftRisk: 'If execution re-entry flattens into a generic shell here, treat that as unfinished same-her drift.',
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
      },
      runtimePreDialogueAwarenessLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
      runtimePreflightSummary: 'identity=Alicization | phase=Phase 1 | open=Repair-first callback continuity | next=Keep the same callback repair seam explicit',
    })

    expect(rebuilt.sameHerHoldDetail).toBe(
      'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
    )
    expect(rebuilt.continuityCue).toBe(
      'Keep this return repair-before-closeness on the same living line until repair settles.',
    )
    expect(rebuilt.preDialogueAwarenessLine).toBe(
      'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
    )
    expect(rebuilt.preDialogueAwarenessSummary).toBe(
      'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
    )
    expect(rebuilt.awarenessLine).toBe(
      'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
    )
  })
})
