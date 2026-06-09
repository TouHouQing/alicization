import { describe, expect, it } from 'vitest'

import { normalizeAlicizationRuntimeDigest } from './alicization-transport-contracts'

describe('alicization-runtime-digest transport normalization', () => {
  it('preserves active-loop continuity arc stage so same-her inward carry survives transport boundaries', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      activeLoop: {
        version: 'alicization-active-loop-v1',
        phase: 'integrate',
        dominantChannel: 'active-memory',
        handoffTarget: 'active-memory',
        continuityArcStage: 'hold-for-opening',
        continuityPreferredTiming: 'next-open-window',
        dialogueReady: true,
        controlReady: false,
        memoryCarry: true,
        companionshipReady: true,
        observationHeavy: false,
        initiativeBudget: 0.68,
        coherence: 0.74,
        summary: 'phase=integrate | handoff=active-memory | continuity-arc=hold-for-opening',
      },
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the host-visible reply.',
        continuityArcStage: 'hold-for-opening',
        continuityPreferredTiming: 'next-open-window',
      },
      channels: [
        {
          id: 'active-memory',
          state: 'hot',
          readiness: 0.92,
          focus: 'callback afterglow carry',
          summary: 'active memory is carrying the hold-for-opening callback line',
        },
      ],
      summary: 'dominant=active-memory',
    })

    expect(digest?.activeLoop?.continuityArcStage).toBe('hold-for-opening')
    expect(digest?.activeLoop?.continuityPreferredTiming).toBe('next-open-window')
    expect(digest?.projectState?.identity).toBe('Alicization is a local-first digital life project building one continuous her.')
    expect(digest?.projectState?.sameHerSelfLine).toBe('Keep one continuous her explicit from self-understanding into the host-visible reply.')
    expect(digest?.projectState?.continuityArcStage).toBe('hold-for-opening')
    expect(digest?.projectState?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('preserves project identity and same-her self line inside project-state digest transport so outer embodiment surfaces can keep the same life thread legible', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the host-visible reply.',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
      summary: 'dominant=active-memory | resident=measured-return',
    })

    expect(digest?.projectState?.identity).toBe('Alicization is a local-first digital life project building one continuous her.')
    expect(digest?.projectState?.sameHerSelfLine).toBe('Keep one continuous her explicit from self-understanding into the host-visible reply.')
    expect(digest?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(digest?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(digest?.projectState?.preferredGazeMode).toBe('soften')
  })

  it('preserves project-state continuity restraint so rest-protective body-line authority survives runtime digest transport', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the host-visible reply.',
        continuityRestraint: 'rest-protective',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'rest-protective',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
      continuityRestraint: 'rest-protective',
      summary: 'dominant=active-memory | restraint=rest-protective',
    })

    expect(digest?.projectState?.continuityRestraint).toBe('rest-protective')
    expect(digest?.projectState?.continuityCadence).toBe('rest-protective')
    expect(digest?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(digest?.projectState?.preferredGazeMode).toBe('soften')
    expect(digest?.continuityRestraint).toBe('rest-protective')
  })

  it('preserves current-conscious-frame continuity summary so same-her self-understanding survives transport boundaries', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
        signature: 'embodiment:audible-same-her-line',
        focusAnchor: 'same callback line after noisy detours',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      },
      channels: [
        {
          id: 'active-memory',
          state: 'hot',
          readiness: 0.92,
          focus: 'callback afterglow carry',
          summary: 'active memory is carrying the hold-for-opening callback line',
        },
      ],
      summary: 'dominant=active-memory',
    })

    expect(digest?.currentConsciousFrame?.reasonTags).toEqual([
      'runtime-conscious-frame',
      'continuity-arc:same-thread-continuation',
    ])
    expect(digest?.currentConsciousFrame?.signature).toBe('embodiment:audible-same-her-line')
    expect(digest?.currentConsciousFrame?.focusAnchor).toBe('same callback line after noisy detours')
    expect(digest?.currentConsciousFrame?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.currentConsciousFrame?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('keeps the same-her inward carry legible through existing digest fields even without a dedicated visible-reply carry field', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      activeLoop: {
        version: 'alicization-active-loop-v1',
        phase: 'integrate',
        dominantChannel: 'active-control',
        handoffTarget: 'active-memory',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        dialogueReady: true,
        controlReady: true,
        memoryCarry: true,
        companionshipReady: false,
        observationHeavy: false,
        initiativeBudget: 0.63,
        coherence: 0.64,
        summary: 'phase=integrate | dominant=active-control | handoff=active-memory | continuity-arc=same-thread-continuation',
      },
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
        focusAnchor: 'same callback line still alive after another coding detour',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      },
      continuityRestraint: 'measured-return',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.65,
      companionshipPressure: 0.53,
      channels: [
        {
          id: 'active-memory',
          state: 'warm',
          readiness: 0.66,
          focus: 'same callback line still alive after another coding detour',
          summary: 'active memory is holding the lower-pressure callback line inward',
        },
      ],
      summary: 'dominant=active-memory | resident=measured-return',
    })

    expect(digest?.activeLoop?.handoffTarget).toBe('active-memory')
    expect(digest?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.activeLoop?.continuityPreferredTiming).toBe('next-open-window')
    expect(digest?.projectState?.sameHerSelfLine).toContain('same living line')
    expect(digest?.projectState?.preferredBlinkCadence).toBe('linger')
    expect(digest?.projectState?.preferredGazeMode).toBe('soften')
    expect(digest?.currentConsciousFrame?.focusAnchor).toContain('same callback line still alive')
    expect(digest?.continuityRestraint).toBe('measured-return')
  })

  it('preserves pre-dialogue project awareness fields in runtime project-state digest so future dialogue entrypoints inherit the same Phase 1 self-brief by contract', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need stronger same-her closure | next=keep the same living line explicit before the visible reply forms.',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation before visible reply authoring.',
        memoryClosureSummary: 'Project-state continuity already survives into runtime preparation before visible reply authoring.',
        primaryOpenLoop: 'memory, initiative, and embodiment still need stronger same-her closure.',
        nextClosureTarget: 'keep the same living line explicit before the visible reply forms.',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the host-visible reply.',
        sameHerDriftRisk: 'If the answer collapses back into generic project narration, treat that as unfinished same-her drift.',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCue: 'same project-awareness line still active before visible reply formation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
      summary: 'dominant=active-memory | project-awareness=pre-dialogue-grounded',
    })

    expect(digest?.projectState?.preflightSummary).toContain('Alicization is a local-first digital life project')
    expect(digest?.projectState?.preDialogueAwarenessLine).toContain('Before answering, remember this is still the same local-first digital life project')
    expect(digest?.projectState?.latestLandedProgress).toContain('Project-state continuity already survives into runtime preparation')
    expect(digest?.projectState?.sameHerDriftRisk).toContain('unfinished same-her drift')
    expect(digest?.projectState?.memoryClosureSummary).toContain('runtime preparation')
    expect(digest?.projectState?.continuityCue).toContain('project-awareness line')
  })

  it('preserves top-level emotional closure cue so stream meta and reopen logic can keep the same closure seam visible after transport normalization', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      summary: 'dominant=active-memory | closure=measured-return',
    })

    expect(digest?.emotionalClosureCue).toContain('same-her closure seam')
    expect(digest?.emotionalClosureCue).toContain('same living line')
  })

  it('preserves emotional-kernel authority in runtime digest so future entrypoints inherit one emotion-memory-initiative-embodiment line', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'rest-protective-companionship',
        initiativeMode: 'rest-guard',
        memoryRecallMode: 'rest-protective-presence',
        embodimentTone: 'rest-protective',
        valence: 0.48,
        arousal: 0.18,
        guardedness: 0.82,
        closenessDrive: 0.22,
        repairNeed: 0.41,
        initiativePressure: 0.16,
        reasonTags: [' late-night-drain ', ' same living line '],
        why: ' keep initiative, memory, and embodiment on one rest-protective living line until the host settles ',
      },
      summary: 'dominant=active-memory | closure=rest-protective',
    })

    expect(digest?.emotionalKernel).toEqual({
      version: 'emotional-kernel-v1',
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'rest-guard',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      valence: 0.48,
      arousal: 0.18,
      guardedness: 0.82,
      closenessDrive: 0.22,
      repairNeed: 0.41,
      initiativePressure: 0.16,
      reasonTags: ['late-night-drain', 'same living line'],
      why: 'keep initiative, memory, and embodiment on one rest-protective living line until the host settles',
    })
  })

  it('preserves affective residue and derived-mind-state affective residue together so structured emotional carry survives transport normalization', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 33_333,
        residues: [
          {
            kind: 'afterglow',
            intensity: 0.73,
            persistence: 0.81,
            confidence: 0.88,
            polarity: 'warm',
            releaseMode: 'delay-until-open-window',
            summary: 'quiet afterglow still prefers a measured return',
            sourceSignals: ['callback-afterglow', 'same-thread'],
            lastUpdatedAt: 33_333,
          },
        ],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.74,
        repairPressure: 0.17,
        burdenPressure: 0.08,
        trustPressure: 0.57,
        restProtectivePressure: 0.23,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.62,
          repairRecovery: 0.41,
          overreachRisk: 0.24,
          fatigueGuard: 0.29,
          afterglowCarry: 0.77,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['same-thread-continuation', 'callback-afterglow'],
          summary: 'measured-return until the callback afterglow settles',
        },
        sourceSignals: ['callback-afterglow', 'quiet-carry'],
        summary: 'afterglow still favors a measured return on the same callback line',
      },
      derivedMindStateBundle: {
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 44_444,
          residues: [
            {
              kind: 'repair',
              intensity: 0.69,
              persistence: 0.79,
              confidence: 0.85,
              polarity: 'protective',
              releaseMode: 'delay-until-open-window',
              summary: 'repair residue still wants to keep the same line quiet',
              sourceSignals: ['repair-before-closeness', 'same-thread'],
              lastUpdatedAt: 44_444,
            },
          ],
          dominantResidueKind: 'repair',
          afterglowPressure: 0.18,
          repairPressure: 0.81,
          burdenPressure: 0.13,
          trustPressure: 0.45,
          restProtectivePressure: 0.27,
          relationshipCadence: {
            cadenceMode: 'repair',
            distancePosture: 'protect-space',
            companionshipDensity: 0.46,
            repairRecovery: 0.71,
            overreachRisk: 0.37,
            fatigueGuard: 0.33,
            afterglowCarry: 0.49,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['repair-before-closeness', 'same-thread-continuation'],
            summary: 'repair cadence still needs the same line to stay quiet',
          },
          sourceSignals: ['repair-before-closeness', 'quiet-carry'],
          summary: 'repair residue still holds the same callback line inward',
        },
      },
      summary: 'dominant=active-memory | closure=affective-residue',
    })

    expect(digest?.affectiveResidue?.dominantResidueKind).toBe('afterglow')
    expect(digest?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(digest?.affectiveResidue?.summary).toContain('same callback line')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('repair')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('same callback line inward')
  })

  it('drops placeholder-filled runtime project-state shells so downstream continuity logic does not mistake them for grounded project awareness', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: ' none ',
        currentPhase: ' unknown ',
        preflightSummary: ' n/a ',
        preDialogueAwarenessLine: ' na ',
        latestLandedProgress: ' null ',
        memoryClosureSummary: ' none ',
        primaryOpenLoop: ' unknown ',
        nextClosureTarget: ' n/a ',
        sameHerSelfLine: ' na ',
        sameHerHoldDetail: ' null ',
        sameHerDriftRisk: ' none ',
        emotionalClosureCue: ' unknown ',
        proactiveSameHerGap: ' n/a ',
        continuityRestraint: ' null ',
        continuityArcStage: ' none ',
        continuityPreferredTiming: ' na ',
        continuityCadence: ' n/a ',
        continuityCue: ' unknown ',
        preferredBlinkCadence: ' none ',
        preferredGazeMode: ' unknown ',
      },
      continuityRestraint: ' none ',
      emotionalClosureCue: ' unknown ',
      summary: 'dominant=active-memory | project-awareness=placeholder-shell',
    })

    expect(digest?.projectState).toBeNull()
    expect(digest?.continuityRestraint).toBeNull()
    expect(digest?.emotionalClosureCue).toBeNull()
  })
})
