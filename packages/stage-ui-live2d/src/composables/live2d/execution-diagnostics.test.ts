import {
  createIdleStageEmbodimentPerformanceState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  buildLive2DExecutionDiagnosticsSnapshot,
  createIdleLive2DExecutionDiagnosticsSnapshot,
} from './execution-diagnostics'

describe('live2d execution diagnostics', () => {
  it('creates an idle diagnostics snapshot', () => {
    expect(createIdleLive2DExecutionDiagnosticsSnapshot()).toEqual({
      activeExpression: null,
      activeMotion: null,
      cue: null,
    })
  })

  it('captures the applied chinese-first expression selection and effective settle timings', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'focus'
    performanceState.activeFacialCue = 'focus'
    performanceState.activeCue = {
      id: 'segment-zh-focus-1',
      index: 0,
      startOffset: 0,
      endOffset: 6,
      text: '继续看这里。',
      emotion: 'thinking',
      gestureWeight: 0.34,
      facialWeight: 0.52,
      prosodyWeight: 0.36,
      beatWeight: 0.3,
      mouthWeight: 0.28,
      headWeight: 0.32,
      facialHoldMs: 320,
      actionHoldMs: 240,
      emotionHoldMs: 320,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
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
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'ObserveSoft',
        index: 1,
      },
      performanceState,
      preferredExpressionAliases: ['CalmInspect'],
      selection: {
        name: 'CalmInspect',
        reason: 'preferred',
        score: 11.4,
      },
    })

    expect(snapshot).toEqual({
      activeExpression: {
        name: 'CalmInspect',
        reason: 'preferred',
        score: 11.4,
        segmentId: 'segment-zh-focus-1',
      },
      activeMotion: {
        group: 'ObserveSoft',
        index: 1,
        segmentId: 'segment-zh-focus-1',
      },
      cue: {
        emotion: 'thinking',
        facialCue: 'focus',
        preferredExpressionAliases: ['CalmInspect'],
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 440,
      },
    })
  })

  it('prefers runtime segment-aware metadata over a synthetic active cue id', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'focus'
    performanceState.activeFacialCue = 'focus'
    performanceState.activeCue = {
      id: 'driver:继续看这里。',
      index: 0,
      startOffset: 0,
      endOffset: 6,
      text: '继续看这里。',
      emotion: 'thinking',
      gestureWeight: 0.34,
      facialWeight: 0.52,
      prosodyWeight: 0.36,
      beatWeight: 0.3,
      mouthWeight: 0.28,
      headWeight: 0.32,
      facialHoldMs: 320,
      actionHoldMs: 240,
      emotionHoldMs: 320,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
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
    }
    performanceState.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-driver-runtime-1',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 0,
      playbackDurationMs: 220,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-driver-runtime-1',
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'ObserveSoft',
        index: 1,
      },
      performanceState,
      preferredExpressionAliases: ['CalmInspect'],
      selection: {
        name: 'CalmInspect',
        reason: 'preferred',
        score: 11.4,
      },
    })

    expect(snapshot.activeExpression?.segmentId).toBe('segment-driver-runtime-1')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-driver-runtime-1')
  })
})
