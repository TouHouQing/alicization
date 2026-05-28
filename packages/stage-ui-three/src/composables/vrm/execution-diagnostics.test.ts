import {
  createIdleStageEmbodimentPerformanceState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  buildVrmExecutionDiagnosticsSnapshot,
  createIdleVrmExecutionDiagnosticsSnapshot,
} from './execution-diagnostics'

describe('vrm execution diagnostics', () => {
  it('creates an idle diagnostics snapshot', () => {
    expect(createIdleVrmExecutionDiagnosticsSnapshot()).toEqual({
      activeEmotion: null,
      activeFacialCue: null,
      cue: null,
    })
  })

  it('captures the applied resident emotion and facial cue resolution with effective blend timing', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-vrm-soft-1',
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
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['relaxed', 'focus'],
      },
      rendererSettle: {
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 440,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['calm'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      performanceState,
    })

    expect(snapshot).toEqual({
      activeEmotion: {
        name: 'thinking',
        resolvedExpressionNames: ['calm'],
        segmentId: 'segment-vrm-soft-1',
      },
      activeFacialCue: {
        name: 'soft-gaze',
        affectsMouth: false,
        segmentId: 'segment-vrm-soft-1',
      },
      cue: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        preferredExpressionAliases: ['relaxed', 'focus'],
        vrmExpressionBlendMs: 360,
      },
    })
  })

  it('prefers runtime segment-aware metadata over a synthetic active cue id', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
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
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['relaxed', 'focus'],
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
      segmentId: 'segment-driver-runtime-vrm-1',
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
      segmentId: 'segment-driver-runtime-vrm-1',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['calm'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      performanceState,
    })

    expect(snapshot.activeEmotion?.segmentId).toBe('segment-driver-runtime-vrm-1')
    expect(snapshot.activeFacialCue?.segmentId).toBe('segment-driver-runtime-vrm-1')
  })
})
