import { describe, expect, it } from 'vitest'

import { buildLive2DAuthorityComparisonView } from './performance-visualizer-live2d-authority'

describe('performance visualizer live2d authority comparison view', () => {
  it('compares planned cue authority against consumed live2d execution', () => {
    const view = buildLive2DAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'live2d',
          face: {
            cue: 'focus',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-explicit-playback-cue-metadata',
          },
          motion: {
            cue: 'ObserveSoft',
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-explicit-playback-cue-metadata',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-explicit-playback-cue-metadata',
            mode: 'energy-phoneme-hybrid',
          },
        },
        speechEvidence: {
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-explicit-playback-cue-metadata | source=prosody-authority',
        },
        live2dExecution: {
          activeExpression: {
            name: 'CalmInspect',
            reason: 'preferred',
            score: 11.4,
            segmentId: 'segment-explicit-playback-cue-metadata',
          },
          activeMotion: {
            group: 'ObserveSoft',
            index: 1,
            segmentId: 'segment-explicit-playback-cue-metadata',
          },
          cue: {
            emotion: 'thinking',
            facialCue: 'focus',
            preferredExpressionAliases: ['CalmInspect'],
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 440,
          },
        },
        playbackTelemetry: {
          cue: {
            id: 'segment-explicit-playback-cue-metadata',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 440,
              vrmActionFadeMs: 280,
              vrmExpressionBlendMs: 360,
            },
          },
        },
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-explicit-playback-cue-metadata',
      plannedExpressionAliases: ['CalmInspect'],
      plannedMotionAliases: ['ObserveSoft'],
      consumedExpressionName: 'CalmInspect',
      consumedMotionGroup: 'ObserveSoft',
      expressionAligned: true,
      motionAligned: true,
      plannedFaceCue: 'focus',
      consumedFaceCue: 'focus',
      faceSource: 'prosody-authority',
      faceSegmentAligned: true,
      plannedMotionCue: 'ObserveSoft',
      consumedMotionCue: 'ObserveSoft',
      motionSource: 'timeline-projection',
      motionSegmentAligned: true,
      consumedLipsyncCue: 'I',
      lipsyncSource: 'prosody-authority',
      lipsyncConfidence: 0.91,
      lipsyncSegmentAligned: true,
      consumedVoiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-explicit-playback-cue-metadata | source=prosody-authority',
      voiceSource: 'prosody-authority',
      voiceSegmentAligned: true,
      plannedLive2dFacialReleaseMs: 320,
      consumedLive2dFacialReleaseMs: 320,
      facialReleaseAligned: true,
      plannedLive2dMotionFollowThroughMs: 440,
      consumedLive2dMotionFollowThroughMs: 440,
      motionFollowThroughAligned: true,
      continuityExecutionAligned: true,
      continuityExecutionAuthoritySegmentId: 'segment-explicit-playback-cue-metadata',
      continuityExecutionActiveDrivers: ['face', 'motion', 'lipsync', 'voice'],
      continuityExecutionMismatchDrivers: [],
      continuityExecutionSummary: 'aligned | authority=segment-explicit-playback-cue-metadata | active=face, motion, lipsync, voice | closure=renderer-rejoin-without-body | lane=face+motion+lipsync+voice-only | remaining-open=none',
    })
  })

  it('returns null when neither planned cue nor consumed live2d execution is present', () => {
    expect(buildLive2DAuthorityComparisonView({
      speech: {
        live2dExecution: null,
        playbackTelemetry: null,
      },
    } as any)).toBeNull()
  })

  it('prefers playback driver authority seed for segment alignment when driver summary segment ids are absent', () => {
    const view = buildLive2DAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'live2d',
          face: {
            cue: 'focus',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: null,
          },
          motion: {
            cue: 'ObserveSoft',
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: null,
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: null,
            mode: 'energy-phoneme-hybrid',
          },
        },
        live2dExecution: {
          activeExpression: {
            name: 'CalmInspect',
          },
          activeMotion: {
            group: 'ObserveSoft',
          },
          cue: {
            facialCue: 'focus',
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 440,
          },
        },
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-authority-seeded-live2d',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-authority-seeded-live2d',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 440,
            },
          },
        },
      },
    } as any)

    expect(view?.faceSegmentAligned).toBe(true)
    expect(view?.motionSegmentAligned).toBe(true)
    expect(view?.lipsyncSegmentAligned).toBe(true)
  })

  it('uses live2d active motion segment metadata when driver summary motion segment is absent', () => {
    const view = buildLive2DAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'live2d',
          face: {
            cue: 'focus',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-runtime-motion-authority',
          },
          motion: {
            cue: 'ObserveSoft',
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: null,
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-runtime-motion-authority',
            mode: 'energy-phoneme-hybrid',
          },
        },
        live2dExecution: {
          activeExpression: {
            name: 'CalmInspect',
            segmentId: 'segment-runtime-motion-authority',
          },
          activeMotion: {
            group: 'ObserveSoft',
            index: 1,
            segmentId: 'segment-runtime-motion-authority',
          },
          cue: {
            facialCue: 'focus',
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 440,
          },
        },
        playbackTelemetry: {
          cue: {
            id: 'segment-runtime-motion-authority',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 440,
            },
          },
        },
      },
    } as any)

    expect(view?.motionSegmentAligned).toBe(true)
  })

  it('uses live2d active expression segment metadata when driver summary face segment is absent', () => {
    const view = buildLive2DAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'live2d',
          face: {
            cue: 'focus',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: null,
          },
          motion: {
            cue: 'ObserveSoft',
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-runtime-face-authority',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-runtime-face-authority',
            mode: 'energy-phoneme-hybrid',
          },
        },
        live2dExecution: {
          activeExpression: {
            name: 'CalmInspect',
            segmentId: 'segment-runtime-face-authority',
          },
          activeMotion: {
            group: 'ObserveSoft',
            index: 1,
            segmentId: 'segment-runtime-face-authority',
          },
          cue: {
            facialCue: 'focus',
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 440,
          },
        },
        playbackTelemetry: {
          cue: {
            id: 'segment-runtime-face-authority',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 440,
            },
          },
        },
      },
    } as any)

    expect(view?.faceSegmentAligned).toBe(true)
  })

  it('deduplicates planned aliases and keeps empty live2d authority lanes neutral instead of reporting false drift', () => {
    const view = buildLive2DAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'live2d',
          face: null,
          motion: null,
          lipsync: null,
        },
        live2dExecution: {
          activeExpression: {
            name: 'CalmInspect',
          },
          activeMotion: {
            group: 'ObserveSoft',
          },
          cue: {
            facialCue: null,
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
          },
        },
        playbackTelemetry: {
          cue: {
            id: 'segment-live2d-dup-alias',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect', 'CalmInspect'],
              preferredMotionAliases: ['ObserveSoft', 'ObserveSoft'],
            },
            rendererSettle: null,
          },
        },
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-live2d-dup-alias',
      plannedExpressionAliases: ['CalmInspect'],
      plannedMotionAliases: ['ObserveSoft'],
      consumedExpressionName: 'CalmInspect',
      consumedMotionGroup: 'ObserveSoft',
      expressionAligned: true,
      motionAligned: true,
      plannedFaceCue: null,
      consumedFaceCue: null,
      faceSource: null,
      faceSegmentAligned: null,
      plannedMotionCue: 'ObserveSoft',
      consumedMotionCue: null,
      motionSource: null,
      motionSegmentAligned: null,
      consumedLipsyncCue: null,
      lipsyncSource: null,
      lipsyncConfidence: null,
      lipsyncSegmentAligned: null,
      consumedVoiceSummary: null,
      voiceSource: null,
      voiceSegmentAligned: null,
      plannedLive2dFacialReleaseMs: null,
      consumedLive2dFacialReleaseMs: null,
      facialReleaseAligned: null,
      plannedLive2dMotionFollowThroughMs: null,
      consumedLive2dMotionFollowThroughMs: null,
      motionFollowThroughAligned: null,
    })
  })

  it('keeps segment-only live2d shell lanes neutral instead of treating them as authority alignment signals', () => {
    const view = buildLive2DAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'live2d',
          face: {
            cue: null,
            source: null,
            confidence: 0,
            segmentId: 'segment-live2d-shell-only',
          },
          motion: {
            cue: null,
            source: null,
            confidence: 0,
            segmentId: 'segment-live2d-shell-only',
          },
          lipsync: {
            cue: null,
            source: null,
            confidence: 0,
            segmentId: 'segment-live2d-shell-only',
            mode: null,
          },
        },
        live2dExecution: {
          activeExpression: {
            name: 'CalmInspect',
            segmentId: 'segment-live2d-shell-only',
          },
          activeMotion: {
            group: 'ObserveSoft',
            index: 1,
            segmentId: 'segment-live2d-shell-only',
          },
          cue: {
            facialCue: null,
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
          },
        },
        playbackTelemetry: {
          cue: {
            id: 'segment-live2d-shell-only',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            rendererSettle: null,
          },
        },
      },
    } as any)

    expect(view?.faceSegmentAligned).toBeNull()
    expect(view?.motionSegmentAligned).toBeNull()
    expect(view?.lipsyncSegmentAligned).toBeNull()
  })

  it('summarizes Live2D continuity execution drift when a consumed lane leaves the active authority segment', () => {
    const view = buildLive2DAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'live2d',
          face: {
            cue: 'soft-gaze',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-live2d-continuity-current',
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-live2d-continuity-current',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-live2d-stale-voice',
          },
        },
        live2dExecution: {
          activeExpression: {
            name: 'RecoverSoft',
            segmentId: 'segment-live2d-continuity-current',
          },
          activeMotion: {
            group: 'StillnessGuard',
            index: 0,
            segmentId: 'segment-live2d-continuity-current',
          },
          cue: {
            facialCue: 'soft-gaze',
            live2dFacialReleaseMs: 380,
            live2dMotionFollowThroughMs: 460,
          },
        },
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-live2d-continuity-current',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'motion'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: false,
          },
          cue: {
            id: 'segment-live2d-continuity-current',
            rendererHints: {
              preferredExpressionAliases: ['RecoverSoft'],
              preferredMotionAliases: ['StillnessGuard'],
            },
            rendererSettle: {
              live2dFacialReleaseMs: 380,
              live2dMotionFollowThroughMs: 460,
            },
          },
        },
      },
    } as any)

    expect(view?.continuityExecutionAligned).toBe(false)
    expect(view?.continuityExecutionActiveDrivers).toEqual(['face', 'motion', 'lipsync'])
    expect(view?.continuityExecutionMismatchDrivers).toEqual(['lipsync'])
    expect(view?.continuityExecutionAuthoritySegmentId).toBe('segment-live2d-continuity-current')
    expect(view?.continuityExecutionSummary).toBe('drift | authority=segment-live2d-continuity-current | active=face, motion, lipsync | mismatch=lipsync | lane=face+motion-only | remaining-open=lipsync+voice')
  })

  it('surfaces Live2D voice authority drift when the audible line points at a stale segment', () => {
    const view = buildLive2DAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'live2d',
          face: {
            cue: 'soft-gaze',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-live2d-voice-current',
          },
          motion: {
            cue: 'stillness_guard',
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-live2d-voice-current',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-live2d-voice-current',
            mode: 'energy-phoneme-hybrid',
          },
        },
        speechEvidence: {
          voiceSummary: 'zh-CN | closure=0.72 | precision=0.88 | provenance=authority-bound | segment=segment-live2d-voice-stale | source=prosody-authority',
        },
        live2dExecution: {
          activeExpression: {
            name: 'RecoverSoft',
            segmentId: 'segment-live2d-voice-current',
          },
          activeMotion: {
            group: 'StillnessGuard',
            index: 0,
            segmentId: 'segment-live2d-voice-current',
          },
          cue: {
            facialCue: 'soft-gaze',
            live2dFacialReleaseMs: 360,
            live2dMotionFollowThroughMs: 420,
          },
        },
        playbackTelemetry: {
          driverAuthority: {
            segmentId: 'segment-live2d-voice-current',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
            voiceSegmentMatched: false,
          },
          cue: {
            id: 'segment-live2d-voice-current',
            rendererHints: {
              preferredExpressionAliases: ['RecoverSoft'],
              preferredMotionAliases: ['StillnessGuard'],
            },
            rendererSettle: {
              live2dFacialReleaseMs: 360,
              live2dMotionFollowThroughMs: 420,
            },
          },
        },
      },
    } as any)

    expect(view?.consumedVoiceSummary).toBe('zh-CN | closure=0.72 | precision=0.88 | provenance=authority-bound | segment=segment-live2d-voice-stale | source=prosody-authority')
    expect(view?.voiceSource).toBe('prosody-authority')
    expect(view?.voiceSegmentAligned).toBe(false)
    expect(view?.continuityExecutionAligned).toBe(false)
    expect(view?.continuityExecutionActiveDrivers).toEqual(['face', 'motion', 'lipsync', 'voice'])
    expect(view?.continuityExecutionMismatchDrivers).toEqual(['voice'])
    expect(view?.continuityExecutionSummary).toBe('drift | authority=segment-live2d-voice-current | active=face, motion, lipsync, voice | mismatch=voice | lane=face+motion+lipsync-only | remaining-open=voice')
  })
})
