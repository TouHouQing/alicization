import { describe, expect, it } from 'vitest'

import { buildVrmAuthorityComparisonView } from './performance-visualizer-vrm-authority'

describe('performance visualizer vrm authority comparison view', () => {
  it('compares planned cue authority against consumed vrm execution', () => {
    const view = buildVrmAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-vrm-1',
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-vrm-1',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-vrm-1',
            mode: 'energy-phoneme-hybrid',
          },
        },
        playbackTelemetry: {
          cue: {
            id: 'segment-vrm-1',
            facialCue: 'focused',
            actionCue: 'observe_focus',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            rendererSettle: {
              vrmActionFadeMs: 280,
              vrmExpressionBlendMs: 360,
            },
          },
        },
      },
      vrmUpdate: {
        lastConsumedExpressionAliases: ['CalmInspect'],
        lastConsumedMotionAliases: ['ObserveSoft'],
        lastConsumedVrmActionFadeMs: 280,
        lastConsumedVrmExpressionBlendMs: 360,
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-vrm-1',
      plannedExpressionAliases: ['CalmInspect'],
      consumedExpressionAliases: ['CalmInspect'],
      expressionAligned: true,
      plannedMotionAliases: ['ObserveSoft'],
      consumedMotionAliases: ['ObserveSoft'],
      motionAligned: true,
      plannedFaceCue: 'focused',
      consumedFaceCue: 'focused',
      faceSource: 'prosody-authority',
      faceSegmentAligned: true,
      plannedActionCue: 'observe_focus',
      consumedActionCue: 'observe_focus',
      motionSource: 'timeline-projection',
      motionSegmentAligned: true,
      consumedLipsyncCue: 'I',
      lipsyncSource: 'prosody-authority',
      lipsyncConfidence: 0.91,
      lipsyncSegmentAligned: true,
      plannedVrmActionFadeMs: 280,
      consumedVrmActionFadeMs: 280,
      vrmActionFadeAligned: true,
      plannedVrmExpressionBlendMs: 360,
      consumedVrmExpressionBlendMs: 360,
      vrmExpressionBlendAligned: true,
    })
  })

  it('returns null when neither planned cue nor consumed vrm execution is present', () => {
    expect(buildVrmAuthorityComparisonView({
      speech: {
        driverSummary: null,
        playbackTelemetry: null,
      },
      vrmUpdate: null,
    } as any)).toBeNull()
  })

  it('prefers playback driver authority seed for segment alignment when driver summary segment ids are absent', () => {
    const view = buildVrmAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: null,
          },
          motion: {
            cue: 'observe_focus',
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
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-authority-seeded-vrm',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-authority-seeded-vrm',
            facialCue: 'focused',
            actionCue: 'observe_focus',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            rendererSettle: {
              vrmActionFadeMs: 280,
              vrmExpressionBlendMs: 360,
            },
          },
        },
      },
      vrmUpdate: {
        lastConsumedExpressionAliases: ['CalmInspect'],
        lastConsumedMotionAliases: ['ObserveSoft'],
        lastConsumedVrmActionFadeMs: 280,
        lastConsumedVrmExpressionBlendMs: 360,
      },
    } as any)

    expect(view?.faceSegmentAligned).toBe(true)
    expect(view?.motionSegmentAligned).toBe(true)
    expect(view?.lipsyncSegmentAligned).toBe(true)
  })

  it('uses vrm active emotion segment metadata when driver summary face segment is absent', () => {
    const view = buildVrmAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: null,
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-runtime-vrm-face',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-runtime-vrm-face',
            mode: 'energy-phoneme-hybrid',
          },
        },
        playbackTelemetry: {
          cue: {
            id: 'segment-runtime-vrm-face',
            facialCue: 'focused',
            actionCue: 'observe_focus',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            rendererSettle: {
              vrmActionFadeMs: 280,
              vrmExpressionBlendMs: 360,
            },
          },
        },
      },
      vrmUpdate: {
        activeEmotion: {
          name: 'thinking',
          resolvedExpressionNames: ['calminspect'],
          segmentId: 'segment-runtime-vrm-face',
        },
        activeFacialCue: {
          name: 'focused',
          affectsMouth: false,
          segmentId: 'segment-runtime-vrm-face',
        },
        lastConsumedExpressionAliases: ['CalmInspect'],
        lastConsumedMotionAliases: ['ObserveSoft'],
        lastConsumedVrmActionFadeMs: 280,
        lastConsumedVrmExpressionBlendMs: 360,
      },
    } as any)

    expect(view?.faceSegmentAligned).toBe(true)
  })

  it('uses vrm active facial cue segment metadata when driver summary face segment is absent', () => {
    const view = buildVrmAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: null,
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-runtime-vrm-facial-cue',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-runtime-vrm-facial-cue',
            mode: 'energy-phoneme-hybrid',
          },
        },
        playbackTelemetry: {
          cue: {
            id: 'segment-runtime-vrm-facial-cue',
            facialCue: 'focused',
            actionCue: 'observe_focus',
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            rendererSettle: {
              vrmActionFadeMs: 280,
              vrmExpressionBlendMs: 360,
            },
          },
        },
      },
      vrmUpdate: {
        activeEmotion: null,
        activeFacialCue: {
          name: 'focused',
          affectsMouth: false,
          segmentId: 'segment-runtime-vrm-facial-cue',
        },
        lastConsumedExpressionAliases: ['CalmInspect'],
        lastConsumedMotionAliases: ['ObserveSoft'],
        lastConsumedVrmActionFadeMs: 280,
        lastConsumedVrmExpressionBlendMs: 360,
      },
    } as any)

    expect(view?.faceSegmentAligned).toBe(true)
  })

  it('treats duplicate planned or consumed aliases as the same VRM authority set instead of false drift', () => {
    const view = buildVrmAuthorityComparisonView({
      speech: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: null,
          motion: null,
          lipsync: null,
        },
        playbackTelemetry: {
          cue: {
            id: 'segment-vrm-dup-alias',
            facialCue: null,
            actionCue: null,
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect', 'CalmInspect'],
              preferredMotionAliases: ['ObserveSoft', 'ObserveSoft'],
            },
            rendererSettle: null,
          },
        },
      },
      vrmUpdate: {
        lastConsumedExpressionAliases: ['CalmInspect'],
        lastConsumedMotionAliases: ['ObserveSoft', 'ObserveSoft'],
        lastConsumedVrmActionFadeMs: null,
        lastConsumedVrmExpressionBlendMs: null,
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-vrm-dup-alias',
      plannedExpressionAliases: ['CalmInspect'],
      consumedExpressionAliases: ['CalmInspect'],
      expressionAligned: true,
      plannedMotionAliases: ['ObserveSoft'],
      consumedMotionAliases: ['ObserveSoft'],
      motionAligned: true,
      plannedFaceCue: null,
      consumedFaceCue: null,
      faceSource: null,
      faceSegmentAligned: null,
      plannedActionCue: null,
      consumedActionCue: null,
      motionSource: null,
      motionSegmentAligned: null,
      consumedLipsyncCue: null,
      lipsyncSource: null,
      lipsyncConfidence: null,
      lipsyncSegmentAligned: null,
      plannedVrmActionFadeMs: null,
      consumedVrmActionFadeMs: null,
      vrmActionFadeAligned: null,
      plannedVrmExpressionBlendMs: null,
      consumedVrmExpressionBlendMs: null,
      vrmExpressionBlendAligned: null,
    })
  })
})
