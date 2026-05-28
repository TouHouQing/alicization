import { describe, expect, it } from 'vitest'

import {
  buildAuthoritySummaryEntries,
  buildAuthoritySegmentRows,
  filterAuthoritySegmentRows,
  sortAuthoritySegmentRows,
} from './performance-visualizer-authority-summary'

describe('performance visualizer authority summary', () => {
  it('builds normalized authority entries for live2d and vrm surfaces', () => {
    const entries = buildAuthoritySummaryEntries({
      live2d: {
        cueId: 'segment-live2d-1',
        cueText: '继续看这里。',
        plannedExpressionAliases: ['CalmInspect'],
        consumedExpressionName: 'CalmInspect',
        expressionAligned: true,
        plannedMotionAliases: ['ObserveSoft'],
        consumedMotionGroup: 'ObserveSoft',
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
        lipsyncSegmentAligned: true,
        lipsyncConfidence: 0.91,
        plannedSettleCue: 'facial-release:320|follow-through:440',
        consumedSettleCue: 'facial-release:320|follow-through:440',
        settleAligned: true,
        plannedLive2dFacialReleaseMs: 320,
        consumedLive2dFacialReleaseMs: 320,
        facialReleaseAligned: true,
        plannedLive2dMotionFollowThroughMs: 440,
        consumedLive2dMotionFollowThroughMs: 440,
        motionFollowThroughAligned: true,
      },
      vrm: {
        cueId: 'segment-vrm-1',
        cueText: '请继续说。',
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
        lipsyncSegmentAligned: true,
        lipsyncConfidence: 0.91,
        plannedSettleCue: 'action-fade:280|expression-blend:360',
        consumedSettleCue: 'action-fade:280|expression-blend:360',
        settleAligned: true,
        plannedVrmActionFadeMs: 280,
        consumedVrmActionFadeMs: 280,
        vrmActionFadeAligned: true,
        plannedVrmExpressionBlendMs: 360,
        consumedVrmExpressionBlendMs: 360,
        vrmExpressionBlendAligned: true,
      },
    } as any)

    expect(entries).toEqual([
      {
        surface: 'live2d',
        lane: 'expression',
        cueId: 'segment-live2d-1',
        planned: 'CalmInspect',
        consumed: 'CalmInspect',
        source: null,
        aligned: true,
      },
      {
        surface: 'live2d',
        lane: 'motion',
        cueId: 'segment-live2d-1',
        planned: 'ObserveSoft',
        consumed: 'ObserveSoft',
        source: 'timeline-projection',
        aligned: true,
      },
      {
        surface: 'live2d',
        lane: 'face',
        cueId: 'segment-live2d-1',
        planned: 'focus',
        consumed: 'focus',
        source: 'prosody-authority',
        aligned: true,
      },
      {
        surface: 'live2d',
        lane: 'lipsync',
        cueId: 'segment-live2d-1',
        planned: 'I',
        consumed: 'I',
        source: 'prosody-authority',
        confidence: 0.91,
        aligned: true,
      },
      {
        surface: 'live2d',
        lane: 'settle',
        cueId: 'segment-live2d-1',
        planned: 'settle',
        consumed: 'settle',
        source: null,
        settle: {
          live2dFacialReleaseMs: {
            planned: 320,
            consumed: 320,
          },
          live2dMotionFollowThroughMs: {
            planned: 440,
            consumed: 440,
          },
        },
        aligned: true,
      },
      {
        surface: 'vrm',
        lane: 'expression',
        cueId: 'segment-vrm-1',
        planned: 'CalmInspect',
        consumed: 'CalmInspect',
        source: null,
        aligned: true,
      },
      {
        surface: 'vrm',
        lane: 'action',
        cueId: 'segment-vrm-1',
        planned: 'observe_focus',
        consumed: 'observe_focus',
        source: 'timeline-projection',
        aligned: true,
      },
      {
        surface: 'vrm',
        lane: 'face',
        cueId: 'segment-vrm-1',
        planned: 'focused',
        consumed: 'focused',
        source: 'prosody-authority',
        aligned: true,
      },
      {
        surface: 'vrm',
        lane: 'lipsync',
        cueId: 'segment-vrm-1',
        planned: 'I',
        consumed: 'I',
        source: 'prosody-authority',
        confidence: 0.91,
        aligned: true,
      },
      {
        surface: 'vrm',
        lane: 'settle',
        cueId: 'segment-vrm-1',
        planned: 'settle',
        consumed: 'settle',
        source: null,
        settle: {
          vrmActionFadeMs: {
            planned: 280,
            consumed: 280,
          },
          vrmExpressionBlendMs: {
            planned: 360,
            consumed: 360,
          },
        },
        aligned: true,
      },
    ])
  })

  it('groups authority entries into segment-oriented drift rows', () => {
    const rows = buildAuthoritySegmentRows([
      {
        surface: 'live2d',
        lane: 'expression',
        cueId: 'segment-live2d-1',
        planned: 'CalmInspect',
        consumed: 'CalmInspect',
        source: null,
        aligned: true,
      },
      {
        surface: 'live2d',
        lane: 'lipsync',
        cueId: 'segment-live2d-1',
        planned: 'I',
        consumed: 'I',
        source: 'prosody-authority',
        confidence: 0.91,
        aligned: true,
      },
      {
        surface: 'live2d',
        lane: 'settle',
        cueId: 'segment-live2d-1',
        planned: 'settle',
        consumed: 'settle',
        source: null,
        settle: {
          live2dFacialReleaseMs: {
            planned: 320,
            consumed: 320,
          },
          live2dMotionFollowThroughMs: {
            planned: 440,
            consumed: 440,
          },
        },
        aligned: true,
      },
      {
        surface: 'vrm',
        lane: 'action',
        cueId: 'segment-vrm-1',
        planned: 'observe_focus',
        consumed: 'observe_focus',
        source: 'timeline-projection',
        aligned: true,
      },
    ], {
      'segment-live2d-1': '继续看这里。',
      'segment-vrm-1': '请继续说。',
    })

    expect(rows).toEqual([
      {
        cueId: 'segment-live2d-1',
        cueText: '继续看这里。',
        surfaces: ['live2d'],
        lanes: ['expression', 'lipsync', 'settle'],
        aligned: true,
        driftStatus: 'all-aligned',
        entries: [
          {
            surface: 'live2d',
            lane: 'expression',
            cueId: 'segment-live2d-1',
            planned: 'CalmInspect',
            consumed: 'CalmInspect',
            source: null,
            aligned: true,
          },
          {
            surface: 'live2d',
            lane: 'lipsync',
            cueId: 'segment-live2d-1',
            planned: 'I',
            consumed: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            aligned: true,
          },
          {
            surface: 'live2d',
            lane: 'settle',
            cueId: 'segment-live2d-1',
            planned: 'settle',
            consumed: 'settle',
            source: null,
            settle: {
              live2dFacialReleaseMs: {
                planned: 320,
                consumed: 320,
              },
              live2dMotionFollowThroughMs: {
                planned: 440,
                consumed: 440,
              },
            },
            aligned: true,
          },
        ],
      },
      {
        cueId: 'segment-vrm-1',
        cueText: '请继续说。',
        surfaces: ['vrm'],
        lanes: ['action'],
        aligned: true,
        driftStatus: 'all-aligned',
        entries: [
          {
            surface: 'vrm',
            lane: 'action',
            cueId: 'segment-vrm-1',
            planned: 'observe_focus',
            consumed: 'observe_focus',
            source: 'timeline-projection',
            aligned: true,
          },
        ],
      },
    ])
  })

  it('sorts drift rows by severity and filters out fully aligned rows when requested', () => {
    const rows = [
      {
        cueId: 'segment-a',
        cueText: '完全对齐',
        surfaces: ['live2d'],
        lanes: ['expression'],
        aligned: true,
        driftStatus: 'all-aligned',
        entries: [],
      },
      {
        cueId: 'segment-b',
        cueText: '轻微漂移',
        surfaces: ['vrm'],
        lanes: ['action'],
        aligned: false,
        driftStatus: 'partial-drift',
        entries: [],
      },
      {
        cueId: 'segment-c',
        cueText: '严重漂移',
        surfaces: ['live2d'],
        lanes: ['lipsync'],
        aligned: false,
        driftStatus: 'hard-drift',
        entries: [],
      },
    ] as any

    expect(sortAuthoritySegmentRows(rows).map(row => row.cueId)).toEqual([
      'segment-c',
      'segment-b',
      'segment-a',
    ])

    expect(filterAuthoritySegmentRows(rows, { onlyDrift: true }).map(row => row.cueId)).toEqual([
      'segment-b',
      'segment-c',
    ])
  })
})
