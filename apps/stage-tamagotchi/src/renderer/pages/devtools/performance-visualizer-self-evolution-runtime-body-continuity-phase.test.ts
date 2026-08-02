import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'

import { describe, expect, it } from 'vitest'

import { resolveSelfEvolutionRuntimeBodyContinuityPhase } from './performance-visualizer-self-evolution-runtime-body-continuity-phase'

function createAuthorityView(overrides: Partial<PerformanceVisualizerPlaybackCueAuthorityView> = {}): PerformanceVisualizerPlaybackCueAuthorityView {
  return {
    cueId: 'cue-1',
    authoritySegmentId: 'segment-1',
    authorityRendererTarget: 'live2d',
    authorityMatchedDrivers: ['body'],
    authoritySources: ['runtime'],
    authorityTrustSummary: null,
    prosodyAuthoritySummary: null,
    traceEmbodimentSummary: null,
    residentMode: null,
    preferredBlinkCadence: null,
    preferredGazeMode: null,
    bodySegmentMatched: true,
    faceSegmentMatched: false,
    motionSegmentMatched: false,
    lipsyncSegmentMatched: false,
    authorityBindingSummary: null,
    authorityMatchSummary: null,
    settleAuthoritySummary: null,
    summaryEntries: [],
    preferredExpressionAliases: [],
    preferredMotionAliases: [],
    live2dFacialReleaseMs: null,
    live2dMotionFollowThroughMs: null,
    vrmActionFadeMs: null,
    vrmExpressionBlendMs: null,
    ...overrides,
  }
}

describe('performance visualizer self evolution runtime body continuity phase', () => {
  it('marks body-only hold when the same living segment is still being carried only by the body line', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase(createAuthorityView())).toBe('body-only-hold')
  })

  it('marks body-carried renderer rejoin when the same body segment still holds while a renderer lane rejoins it', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase(createAuthorityView({
      authorityMatchedDrivers: ['body', 'face'],
      faceSegmentMatched: true,
    }))).toBe('body-carried-to-renderer-rejoin')
  })

  it('marks body-carried renderer rejoin when the same body segment still holds while the voice lane rejoins it on the same segment', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase(createAuthorityView({
      authorityMatchedDrivers: ['body'],
      authorityRendererTarget: 'speech',
      voiceSegmentMatched: true,
    }))).toBe('body-carried-to-renderer-rejoin')
  })

  it('marks full cross-modal lock when body and the renderer lanes have fully rejoined onto one segment', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase(createAuthorityView({
      authorityMatchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }))).toBe('full-cross-modal-lock')
  })

  it('marks renderer rejoin without body when renderer lanes align but the body line is no longer carrying the same living segment', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase(createAuthorityView({
      authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }))).toBe('renderer-rejoin-without-body')
  })

  it('infers full cross-modal lock from typed VRM continuity frame evidence when authority lane flags are still missing', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase({
      ...createAuthorityView({
        cueId: 'segment-continuity-lock-1',
        authoritySegmentId: 'segment-continuity-lock-1',
        authorityMatchedDrivers: [],
        bodySegmentMatched: null,
        faceSegmentMatched: null,
        motionSegmentMatched: null,
        lipsyncSegmentMatched: null,
        voiceSegmentMatched: null,
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        settleAuthoritySummary: null,
      }),
      continuityFrameActiveDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'],
      continuityFrameMismatchDrivers: [],
      continuityFramePerformanceSegmentId: 'segment-continuity-lock-1',
      continuityFrameSpeechSegmentId: 'segment-continuity-lock-1',
      continuityFrameSummary: 'aligned | segment=segment-continuity-lock-1 | active=body, face, motion, lipsync, voice | closure=full-cross-modal-lock | lane=full-driver-rejoin | remaining-open=none',
    } as any)).toBe('full-cross-modal-lock')
  })

  it('infers body-carried renderer rejoin from typed VRM continuity frame evidence when only body, face, and motion have rejoined so far', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase({
      ...createAuthorityView({
        cueId: 'segment-continuity-body-face-motion-1',
        authoritySegmentId: 'segment-continuity-body-face-motion-1',
        authorityMatchedDrivers: [],
        bodySegmentMatched: null,
        faceSegmentMatched: null,
        motionSegmentMatched: null,
        lipsyncSegmentMatched: null,
        voiceSegmentMatched: null,
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        settleAuthoritySummary: null,
      }),
      continuityFrameActiveDrivers: ['body', 'face', 'motion'],
      continuityFrameMismatchDrivers: [],
      continuityFramePerformanceSegmentId: 'segment-continuity-body-face-motion-1',
      continuityFrameSpeechSegmentId: 'segment-continuity-body-face-motion-1',
      continuityFrameSummary: 'aligned | segment=segment-continuity-body-face-motion-1 | active=body, face, motion | lane=body+face+motion-only | remaining-open=lipsync+voice',
    } as any)).toBe('body-carried-to-renderer-rejoin')
  })

  it('infers renderer rejoin without body from typed Live2D continuity execution evidence when authority lane flags are missing', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase({
      ...createAuthorityView({
        cueId: 'segment-continuity-live2d-rejoin-1',
        authoritySegmentId: 'segment-continuity-live2d-rejoin-1',
        authorityMatchedDrivers: [],
        bodySegmentMatched: null,
        faceSegmentMatched: null,
        motionSegmentMatched: null,
        lipsyncSegmentMatched: null,
        voiceSegmentMatched: null,
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        settleAuthoritySummary: null,
      }),
      continuityExecutionActiveDrivers: ['face', 'motion', 'lipsync', 'voice'],
      continuityExecutionMismatchDrivers: [],
      continuityExecutionAuthoritySegmentId: 'segment-continuity-live2d-rejoin-1',
      continuityExecutionSummary: 'aligned | authority=segment-continuity-live2d-rejoin-1 | active=face, motion, lipsync, voice | closure=renderer-rejoin-without-body | lane=face+motion+lipsync+voice-only | remaining-open=none',
    } as any)).toBe('renderer-rejoin-without-body')
  })

  it('does not infer renderer rejoin without body from stale Live2D continuity execution evidence owned by another living segment', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase({
      ...createAuthorityView({
        cueId: 'segment-current-self-evolution-line',
        authoritySegmentId: 'segment-current-self-evolution-line',
        authorityMatchedDrivers: [],
        bodySegmentMatched: null,
        faceSegmentMatched: null,
        motionSegmentMatched: null,
        lipsyncSegmentMatched: null,
        voiceSegmentMatched: null,
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        settleAuthoritySummary: null,
      }),
      continuityExecutionActiveDrivers: ['face', 'motion', 'lipsync', 'voice'],
      continuityExecutionMismatchDrivers: [],
      continuityExecutionAuthoritySegmentId: 'segment-stale-self-evolution-line',
      continuityExecutionSummary: 'aligned | authority=segment-stale-self-evolution-line | active=face, motion, lipsync, voice | closure=renderer-rejoin-without-body | lane=face+motion+lipsync+voice-only | remaining-open=none',
    } as any)).toBeNull()
  })

  it('does not infer full cross-modal lock from stale VRM continuity frame evidence owned by another living segment', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase({
      ...createAuthorityView({
        cueId: 'segment-current-self-evolution-frame',
        authoritySegmentId: 'segment-current-self-evolution-frame',
        authorityMatchedDrivers: [],
        bodySegmentMatched: null,
        faceSegmentMatched: null,
        motionSegmentMatched: null,
        lipsyncSegmentMatched: null,
        voiceSegmentMatched: null,
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        settleAuthoritySummary: null,
      }),
      continuityFrameActiveDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'],
      continuityFrameMismatchDrivers: [],
      continuityFramePerformanceSegmentId: 'segment-stale-self-evolution-frame',
      continuityFrameSpeechSegmentId: 'segment-stale-self-evolution-frame',
      continuityFrameSummary: 'aligned | segment=segment-stale-self-evolution-frame | active=body, face, motion, lipsync, voice | closure=full-cross-modal-lock | lane=full-driver-rejoin | remaining-open=none',
    } as any)).toBeNull()
  })

  it('stays null without an authority view snapshot', () => {
    expect(resolveSelfEvolutionRuntimeBodyContinuityPhase(null)).toBeNull()
  })
})
