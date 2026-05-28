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
      plannedLive2dFacialReleaseMs: 320,
      consumedLive2dFacialReleaseMs: 320,
      facialReleaseAligned: true,
      plannedLive2dMotionFollowThroughMs: 440,
      consumedLive2dMotionFollowThroughMs: 440,
      motionFollowThroughAligned: true,
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
      plannedLive2dFacialReleaseMs: null,
      consumedLive2dFacialReleaseMs: null,
      facialReleaseAligned: null,
      plannedLive2dMotionFollowThroughMs: null,
      consumedLive2dMotionFollowThroughMs: null,
      motionFollowThroughAligned: null,
    })
  })
})
