import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionEvidencePanels } from './performance-visualizer-self-evolution-evidence'

describe('performance visualizer self evolution evidence', () => {
  it('shows persona ownership and proactive decisions as supplied facts', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        whySummary: 'approved persona evidence',
        matchedSignals: ['persona:observer'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      proactiveActionChain: {
        status: 'grounded',
        personaPreferredAction: 'hover',
        runtimeSelectedAction: 'hold',
        runtimeShouldSpeak: false,
        matchedSignals: ['runtime-selected-action:hold'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
    })

    expect(panels).toEqual([
      {
        id: 'persona-bias-provenance',
        title: 'persona bias provenance',
        lines: [
          'status: grounded',
          'relationshipPosture: observer',
          'initiativeStyle: observant',
          'silenceReconnect: hold',
          'comfortStyle: quiet-presence',
          'preferredProactiveStyle: silent-observe',
          'whySummary: approved persona evidence',
          'matchedSignals: persona:observer',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: n/a',
        ],
      },
      {
        id: 'proactive-action-chain',
        title: 'proactive action chain',
        lines: [
          'status: grounded',
          'personaPreferredAction: hover',
          'runtimeSelectedAction: hold',
          'runtimeShouldSpeak: false',
          'matchedSignals: runtime-selected-action:hold',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: n/a',
        ],
      },
    ])
  })

  it('shows renderer body phase, surface, prosody and five authority lanes', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | source=prosody-authority | segment=segment-7',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'rejoin',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focus',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focus',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focus',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: null,
        authorityMismatchSummary: 'motion and lipsync differ',
        authorityMismatchDisplay: '动作与口型未命中',
        matchedSignals: [
          'authority-body:yes',
          'authority-face:yes',
          'authority-voice:yes',
        ],
        missingSignals: ['driver-action-source'],
        driftingSignals: [
          'authority-motion:no',
          'authority-lipsync:no',
        ],
        reasons: ['unstructured upstream detail'],
      },
    })

    const panel = panels.find(item => item.id === 'renderer-authority-projection')
    expect(panel?.lines).toContain('bodyContinuityPhase: renderer-rejoin-without-body')
    expect(panel?.lines).toContain('rendererRejoinSurfaceKey: authority:renderer-rejoin:live2d')
    expect(panel?.lines).toContain('prosodyAuthoritySummary: mode=energy-phoneme-hybrid | source=prosody-authority | segment=segment-7')
    expect(panel?.lines).toContain('authorityMatchSummary: 身体命中 / 表情命中 / 动作未命中 / 口型未命中 / 声音命中')
    expect(panel?.lines).toContain('matchedSignals: authority-body:yes, authority-face:yes, authority-voice:yes')
    expect(panel?.lines).toContain('missingSignals: driver-action-source')
    expect(panel?.lines).toContain('driftingSignals: authority-motion:no, authority-lipsync:no')
    expect(panel?.lines.some(line => line.startsWith('reasons:'))).toBe(false)
  })

  it('shows runtime continuity structure without deriving a narrative from reasons', () => {
    const buildPanel = (reason: string) => buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        rendererTarget: 'speech',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime projection',
        activeThreadId: 'thread-8',
        activeThreadTitle: 'renderer repair',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'intention-8',
        focusBeliefId: 'belief-8',
        rationaleTags: ['renderer-repair'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [
          'authority-body:yes',
          'authority-lipsync:yes',
        ],
        missingSignals: ['authority-source:voice'],
        driftingSignals: [
          'authority-face:no',
          'authority-motion:no',
          'authority-voice:no',
        ],
        reasons: [reason],
      },
    }).find(item => item.id === 'runtime-continuity-projection')

    const first = buildPanel('free text one')
    const second = buildPanel('free text two')

    expect(first).toEqual(second)
    expect(first?.lines).toContain('bodyContinuityPhase: body-carried-to-renderer-rejoin')
    expect(first?.lines).toContain('rendererRejoinSurfaceKey: authority:renderer-rejoin:speech')
    expect(first?.lines).toContain('rendererTarget: speech')
    expect(first?.lines).toContain('continuityAuthoritySummary: 身体命中 / 表情未命中 / 动作未命中 / 口型命中 / 声音未命中')
    expect(first?.lines).toContain('matchedSignals: authority-body:yes, authority-lipsync:yes')
    expect(first?.lines).toContain('missingSignals: authority-source:voice')
    expect(first?.lines).toContain('driftingSignals: authority-face:no, authority-motion:no, authority-voice:no')
    expect(first?.lines.some(line => line.startsWith('reasons:'))).toBe(false)
  })
})
