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
      activeMotion: null,
      activeBody: null,
      activeLipSync: null,
      activeVoice: null,
      cue: null,
    })
  })

  it('captures the applied resident emotion, facial cue, motion cue, and effective blend timing', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.performance.actionCue = 'observe_focus'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeActionCue = 'observe_focus'
    performanceState.driverAuthority = {
      segmentId: 'segment-vrm-soft-1',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }
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
        preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        residentMode: 'measured-return',
        signature: 'embodiment:audible-same-her-line',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 440,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentBody: {
        settle: 0.81,
        openness: 0.46,
      },
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['calm'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'ObserveSoft',
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.42,
      },
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
      activeMotion: {
        cue: 'ObserveSoft',
        segmentId: 'segment-vrm-soft-1',
      },
      activeBody: {
        settle: 0.81,
        openness: 0.46,
        segmentId: 'segment-vrm-soft-1',
      },
      activeLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.42,
        segmentId: 'segment-vrm-soft-1',
      },
      activeVoice: null,
      cue: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        preferredExpressionAliases: ['relaxed', 'focus'],
        preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        residentMode: 'measured-return',
        signature: 'embodiment:audible-same-her-line',
        vrmActionFadeMs: 280,
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
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        residentMode: 'repair-before-closeness',
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
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['calm'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'ObserveSoft',
      },
      performanceState,
    })

    expect(snapshot.activeEmotion?.segmentId).toBe('segment-driver-runtime-vrm-1')
    expect(snapshot.activeFacialCue?.segmentId).toBe('segment-driver-runtime-vrm-1')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-driver-runtime-vrm-1')
    expect(snapshot.cue?.residentMode).toBe('repair-before-closeness')
    expect(snapshot.cue?.preferredBlinkCadence).toBe('quiet')
    expect(snapshot.cue?.preferredMotionAliases).toEqual(['ObserveSoft'])
    expect(snapshot.cue?.reasonTags).toEqual([])
    expect(snapshot.cue?.signature).toBeNull()
    expect(snapshot.cue?.vrmActionFadeMs).toBe(280)
  })

  it('keeps vrm diagnostics renderer-coherent when face motion and lipsync have rejoined but body authority is still withheld', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.performance.actionCue = 'observe_soft'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeActionCue = 'observe_soft'
    performanceState.activeCue = {
      id: 'segment-vrm-restrained-renderer-only',
      index: 0,
      startOffset: 0,
      endOffset: 7,
      text: '先收回来一点。',
      emotion: 'thinking',
      gestureWeight: 0.22,
      facialWeight: 0.42,
      prosodyWeight: 0.28,
      beatWeight: 0.18,
      mouthWeight: 0.2,
      headWeight: 0.2,
      facialHoldMs: 360,
      actionHoldMs: 320,
      emotionHoldMs: 360,
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 360,
        live2dMotionFollowThroughMs: 420,
        vrmExpressionBlendMs: 340,
        vrmActionFadeMs: 280,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-vrm-restrained-renderer-only',
      streamId: 'stream-vrm-restrained-renderer-only',
      segmentId: 'segment-vrm-restrained-renderer-only',
      ownerId: 'alice',
      text: '先收回来一点。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 220,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-vrm-restrained-renderer-only',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentBody: {
        settle: 0.8,
        openness: 0.49,
      },
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['recoversoft'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'ObserveSoft',
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.31,
      },
      performanceState,
    })

    expect(snapshot.activeEmotion).toEqual(expect.objectContaining({
      name: 'thinking',
      segmentId: 'segment-vrm-restrained-renderer-only',
    }))
    expect(snapshot.activeFacialCue).toEqual(expect.objectContaining({
      name: 'soft-gaze',
      segmentId: 'segment-vrm-restrained-renderer-only',
    }))
    expect(snapshot.activeMotion).toEqual(expect.objectContaining({
      cue: 'ObserveSoft',
      segmentId: 'segment-vrm-restrained-renderer-only',
    }))
    expect(snapshot.activeLipSync).toEqual(expect.objectContaining({
      active: true,
      segmentId: 'segment-vrm-restrained-renderer-only',
    }))
    expect(snapshot.activeBody).toBeNull()
    expect(snapshot.cue).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredMotionAliases: ['ObserveSoft'],
      vrmActionFadeMs: 280,
      vrmExpressionBlendMs: 340,
    }))
  })

  it('keeps later segment cue diagnostics aligned with active segment authority when active cue metadata is stale', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-earlier-shell',
      index: 0,
      startOffset: 0,
      endOffset: 5,
      text: '先停一下。',
      emotion: 'thinking',
      gestureWeight: 0.16,
      facialWeight: 0.32,
      prosodyWeight: 0.2,
      beatWeight: 0.18,
      mouthWeight: 0.18,
      headWeight: 0.18,
      facialHoldMs: 180,
      actionHoldMs: 160,
      emotionHoldMs: 180,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'normal',
        preferredGazeMode: 'steady',
        residentMode: 'dialogue',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 220,
        live2dMotionFollowThroughMs: 260,
        vrmActionFadeMs: 220,
        vrmExpressionBlendMs: 240,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-later-living-line',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 280,
      metadata: null,
      cue: {
        id: 'segment-later-living-line',
        index: 1,
        startOffset: 6,
        endOffset: 12,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.24,
        facialWeight: 0.48,
        prosodyWeight: 0.26,
        beatWeight: 0.22,
        mouthWeight: 0.22,
        headWeight: 0.24,
        facialHoldMs: 340,
        actionHoldMs: 280,
        emotionHoldMs: 340,
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard'],
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
          residentMode: 'repair-before-closeness',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 340,
          vrmExpressionBlendMs: 380,
        },
      },
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-later-living-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['calm'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'StillnessGuard',
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.38,
      },
      performanceState,
    })

    expect(snapshot.activeEmotion?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeFacialCue?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: [],
      residentMode: 'repair-before-closeness',
      signature: null,
      vrmActionFadeMs: 340,
      vrmExpressionBlendMs: 380,
    })
  })

  it('keeps a still-playing vrm motion pinned to the segment that actually started it even after later authority metadata arrives', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-earlier-shell',
      index: 0,
      startOffset: 0,
      endOffset: 5,
      text: '先停一下。',
      emotion: 'thinking',
      gestureWeight: 0.16,
      facialWeight: 0.32,
      prosodyWeight: 0.2,
      beatWeight: 0.18,
      mouthWeight: 0.18,
      headWeight: 0.18,
      facialHoldMs: 180,
      actionHoldMs: 160,
      emotionHoldMs: 180,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'normal',
        preferredGazeMode: 'steady',
        residentMode: 'dialogue',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 220,
        live2dMotionFollowThroughMs: 260,
        vrmActionFadeMs: 220,
        vrmExpressionBlendMs: 240,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-later-living-line',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 280,
      metadata: null,
      cue: {
        id: 'segment-later-living-line',
        index: 1,
        startOffset: 6,
        endOffset: 12,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.24,
        facialWeight: 0.48,
        prosodyWeight: 0.26,
        beatWeight: 0.22,
        mouthWeight: 0.22,
        headWeight: 0.24,
        facialHoldMs: 340,
        actionHoldMs: 280,
        emotionHoldMs: 340,
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard'],
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
          residentMode: 'repair-before-closeness',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 340,
          vrmExpressionBlendMs: 380,
        },
      },
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-later-living-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['calm'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'ObserveSoft',
        segmentId: 'segment-earlier-shell',
      } as any,
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.38,
      },
      performanceState,
    })

    expect(snapshot.activeEmotion?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeFacialCue?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-earlier-shell')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: [],
      residentMode: 'repair-before-closeness',
      signature: null,
      vrmActionFadeMs: 340,
      vrmExpressionBlendMs: 380,
    })
  })

  it('keeps a still-carry vrm mouth proof pinned to the segment that actually started it even after later authority metadata arrives', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-earlier-shell',
      index: 0,
      startOffset: 0,
      endOffset: 5,
      text: '先停一下。',
      emotion: 'thinking',
      gestureWeight: 0.16,
      facialWeight: 0.32,
      prosodyWeight: 0.2,
      beatWeight: 0.18,
      mouthWeight: 0.18,
      headWeight: 0.18,
      facialHoldMs: 180,
      actionHoldMs: 160,
      emotionHoldMs: 180,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'normal',
        preferredGazeMode: 'steady',
        residentMode: 'dialogue',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 220,
        live2dMotionFollowThroughMs: 260,
        vrmActionFadeMs: 220,
        vrmExpressionBlendMs: 240,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-later-living-line',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 280,
      metadata: null,
      cue: {
        id: 'segment-later-living-line',
        index: 1,
        startOffset: 6,
        endOffset: 12,
        text: '继续看这里。',
        emotion: 'thinking',
        gestureWeight: 0.24,
        facialWeight: 0.48,
        prosodyWeight: 0.26,
        beatWeight: 0.22,
        mouthWeight: 0.22,
        headWeight: 0.24,
        facialHoldMs: 340,
        actionHoldMs: 280,
        emotionHoldMs: 340,
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        actionWindow: 'none',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard'],
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
          residentMode: 'repair-before-closeness',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 340,
          vrmExpressionBlendMs: 380,
        },
      },
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-later-living-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['calm'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'StillnessGuard',
      },
      currentLipSync: {
        active: false,
        dominantViseme: 'ih',
        dominantWeight: 0.22,
        segmentId: 'segment-earlier-shell',
      } as any,
      performanceState,
    })

    expect(snapshot.activeEmotion?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeFacialCue?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-earlier-shell')
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: [],
      residentMode: 'repair-before-closeness',
      signature: null,
      vrmActionFadeMs: 340,
      vrmExpressionBlendMs: 380,
    })
  })

  it('keeps cadence-aware same-her follow-through cue context visible after vrm motion outlives the cleared active cue', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = null
    performanceState.activeSegment = null
    performanceState.driverAuthority = null

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['recoversoft'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'StillnessGuard',
        segmentId: 'segment-vrm-same-her-follow-through-1',
        cueSnapshot: {
          id: 'segment-vrm-same-her-follow-through-1',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredExpressionAliases: ['RecoverSoft'],
            preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
            reasonTags: ['same-her-return'],
            signature: 'same-her-hold:slower-lower-pressure',
          },
          rendererSettle: {
            vrmActionFadeMs: 420,
            vrmExpressionBlendMs: 560,
          },
        },
      } as any,
      performanceState,
    })

    expect(snapshot.activeEmotion).toEqual({
      name: 'thinking',
      resolvedExpressionNames: ['recoversoft'],
      segmentId: null,
    })
    expect(snapshot.activeFacialCue).toEqual({
      name: 'soft-gaze',
      affectsMouth: false,
      segmentId: null,
    })
    expect(snapshot.activeMotion).toEqual({
      cue: 'StillnessGuard',
      segmentId: 'segment-vrm-same-her-follow-through-1',
    })
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      reasonTags: ['same-her-return'],
      residentMode: 'repair-before-closeness',
      signature: 'same-her-hold:slower-lower-pressure',
      vrmActionFadeMs: 420,
      vrmExpressionBlendMs: 560,
    })
  })

  it('keeps cadence-aware same-her cue context visible when only the vrm lipsync continuity tail remains after speech clears', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = null
    performanceState.activeSegment = null
    performanceState.driverAuthority = null

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['recoversoft'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.22,
        segmentId: 'segment-vrm-same-her-lipsync-tail-1',
        cueSnapshot: {
          id: 'segment-vrm-same-her-lipsync-tail-1',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredExpressionAliases: ['RecoverSoft'],
            preferredMotionAliases: ['StillnessGuard'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
            reasonTags: ['same-her-return'],
            signature: 'same-her-hold:slower-lower-pressure',
          },
          rendererSettle: {
            vrmActionFadeMs: 420,
            vrmExpressionBlendMs: 560,
          },
        },
      } as any,
      performanceState,
      speechRenderState: {
        active: false,
        phase: 'idle',
        playbackPhase: 'idle',
        revision: 4,
        item: null,
      } as any,
    })

    expect(snapshot.activeEmotion).toEqual({
      name: 'thinking',
      resolvedExpressionNames: ['recoversoft'],
      segmentId: null,
    })
    expect(snapshot.activeFacialCue).toEqual({
      name: 'soft-gaze',
      affectsMouth: false,
      segmentId: null,
    })
    expect(snapshot.activeLipSync).toEqual({
      active: true,
      dominantViseme: 'ih',
      dominantWeight: 0.22,
      segmentId: 'segment-vrm-same-her-lipsync-tail-1',
    })
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      reasonTags: ['same-her-return'],
      residentMode: 'repair-before-closeness',
      signature: 'same-her-hold:slower-lower-pressure',
      vrmActionFadeMs: 420,
      vrmExpressionBlendMs: 560,
    })
  })

  it('keeps measured-return same-her restraint visible when only face motion and lipsync have rejoined the later living line', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-earlier-measured-shell',
      index: 0,
      startOffset: 0,
      endOffset: 5,
      text: '先别一下子贴太近。',
      emotion: 'thinking',
      gestureWeight: 0.16,
      facialWeight: 0.3,
      prosodyWeight: 0.18,
      beatWeight: 0.16,
      mouthWeight: 0.16,
      headWeight: 0.16,
      facialHoldMs: 180,
      actionHoldMs: 160,
      emotionHoldMs: 180,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'normal',
        preferredGazeMode: 'steady',
        residentMode: 'dialogue',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 220,
        live2dMotionFollowThroughMs: 260,
        vrmActionFadeMs: 220,
        vrmExpressionBlendMs: 240,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-measured-1',
      streamId: 'stream-measured-1',
      segmentId: 'segment-measured-later-living-line',
      ownerId: 'alice',
      text: '我先沿着这条线中性可见占位。',
      special: null,
      continuityHoldMs: 320,
      playbackDurationMs: 260,
      metadata: null,
      cue: {
        id: 'segment-measured-later-living-line',
        index: 1,
        startOffset: 0,
        endOffset: 12,
        text: '我先沿着这条线中性可见占位。',
        emotion: 'thinking',
        gestureWeight: 0.24,
        facialWeight: 0.44,
        prosodyWeight: 0.22,
        beatWeight: 0.16,
        mouthWeight: 0.18,
        headWeight: 0.16,
        facialHoldMs: 340,
        actionHoldMs: 260,
        emotionHoldMs: 380,
        facialCue: 'soft-gaze',
        actionCue: 'steady_focus',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'hold',
        rendererHints: {
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          residentMode: 'measured-return',
          signature: 'embodiment:audible-same-her-line',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 340,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 280,
          vrmExpressionBlendMs: 360,
        },
      },
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-measured-later-living-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentBody: {
        settle: 0.9,
        openness: 0.36,
      },
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['calm'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'ObserveSoft',
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.37,
      },
      performanceState,
    })

    expect(snapshot.activeEmotion?.segmentId).toBe('segment-measured-later-living-line')
    expect(snapshot.activeFacialCue?.segmentId).toBe('segment-measured-later-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-measured-later-living-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-measured-later-living-line')
    expect(snapshot.activeBody).toBeNull()
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      residentMode: 'measured-return',
      signature: 'embodiment:audible-same-her-line',
      vrmActionFadeMs: 280,
      vrmExpressionBlendMs: 360,
    })
  })

  it('keeps vrm visible execution on the inward callback line while voice and lipsync remain the final rejoin seam', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.performance.actionCue = 'idle_settle'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeActionCue = 'idle_settle'
    performanceState.activeCue = {
      id: 'segment-earlier-open-shell',
      index: 0,
      startOffset: 0,
      endOffset: 5,
      text: '先别急着贴近。',
      emotion: 'thinking',
      gestureWeight: 0.16,
      facialWeight: 0.3,
      prosodyWeight: 0.18,
      beatWeight: 0.16,
      mouthWeight: 0.16,
      headWeight: 0.16,
      facialHoldMs: 180,
      actionHoldMs: 160,
      emotionHoldMs: 180,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'normal',
        preferredGazeMode: 'steady',
        residentMode: 'dialogue',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 220,
        live2dMotionFollowThroughMs: 260,
        vrmActionFadeMs: 220,
        vrmExpressionBlendMs: 240,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-vrm-voice-seam-1',
      streamId: 'stream-vrm-voice-seam-1',
      segmentId: 'segment-vrm-voice-seam-later-line',
      ownerId: 'alice',
      text: '我先沿着这条线把声音也接回来。',
      special: null,
      continuityHoldMs: 360,
      playbackDurationMs: 280,
      metadata: null,
      cue: {
        id: 'segment-vrm-voice-seam-later-line',
        index: 1,
        startOffset: 0,
        endOffset: 15,
        text: '我先沿着这条线把声音也接回来。',
        emotion: 'thinking',
        gestureWeight: 0.24,
        facialWeight: 0.46,
        prosodyWeight: 0.24,
        beatWeight: 0.18,
        mouthWeight: 0.2,
        headWeight: 0.18,
        facialHoldMs: 360,
        actionHoldMs: 300,
        emotionHoldMs: 380,
        facialCue: 'soft-gaze',
        actionCue: 'idle_settle',
        actionWindow: 'segment-start',
        interruptMode: 'soft-interrupt',
        settleMode: 'linger',
        rendererHints: {
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          residentMode: 'repair-before-closeness',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 340,
          vrmExpressionBlendMs: 380,
        },
      },
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-vrm-voice-seam-later-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'face', 'motion'],
      sources: ['segment-carry'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: false,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentBody: {
        settle: 0.88,
        openness: 0.34,
      },
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['recoversoft'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'StillnessGuard',
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.35,
      },
      performanceState,
    })

    expect(snapshot.activeEmotion).toEqual({
      name: 'thinking',
      resolvedExpressionNames: ['recoversoft'],
      segmentId: 'segment-vrm-voice-seam-later-line',
    })
    expect(snapshot.activeFacialCue).toEqual({
      name: 'soft-gaze',
      affectsMouth: false,
      segmentId: 'segment-vrm-voice-seam-later-line',
    })
    expect(snapshot.activeMotion).toEqual({
      cue: 'StillnessGuard',
      segmentId: 'segment-vrm-voice-seam-later-line',
    })
    expect(snapshot.activeBody).toEqual({
      settle: 0.88,
      openness: 0.34,
      segmentId: 'segment-vrm-voice-seam-later-line',
    })
    expect(snapshot.activeLipSync).toEqual({
      active: true,
      dominantViseme: 'ih',
      dominantWeight: 0.35,
      segmentId: 'segment-vrm-voice-seam-later-line',
    })
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: [],
      residentMode: 'repair-before-closeness',
      signature: null,
      vrmActionFadeMs: 340,
      vrmExpressionBlendMs: 380,
    })
  })

  it('keeps vrm visible voice execution on the continuity state even before a structured voice summary exists', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.performance.actionCue = 'steady_focus'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeActionCue = 'steady_focus'
    performanceState.activeCue = {
      id: 'segment-vrm-visible-voice-only-1',
      index: 0,
      startOffset: 0,
      endOffset: 12,
      text: '我还沿着这一条线发声。',
      emotion: 'thinking',
      gestureWeight: 0.22,
      facialWeight: 0.4,
      prosodyWeight: 0.24,
      beatWeight: 0.18,
      mouthWeight: 0.2,
      headWeight: 0.18,
      facialHoldMs: 320,
      actionHoldMs: 260,
      emotionHoldMs: 340,
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'repair-before-closeness',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 340,
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 300,
        vrmExpressionBlendMs: 360,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-vrm-visible-voice-only-1',
      streamId: 'stream-vrm-visible-voice-only-1',
      segmentId: 'segment-vrm-visible-voice-only-1',
      ownerId: 'alice',
      text: '我还沿着这一条线发声。',
      special: null,
      continuityHoldMs: 300,
      playbackDurationMs: 240,
      metadata: null,
      cue: performanceState.activeCue,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-vrm-visible-voice-only-1',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentBody: {
        settle: 0.9,
        openness: 0.33,
      },
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['recoversoft'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'StillnessGuard',
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.36,
      },
      speechRenderState: {
        active: true,
        phase: 'playing',
        playbackPhase: 'playing',
        revision: 3,
        item: {
          intentId: 'intent-vrm-visible-voice-only-1',
          streamId: 'stream-vrm-visible-voice-only-1',
          segmentId: 'segment-vrm-visible-voice-only-1',
          ownerId: 'alice',
          text: '我还沿着这一条线发声。',
          special: null,
          continuityHoldMs: 300,
          playbackDurationMs: 240,
          cue: performanceState.activeCue,
          metadata: null,
          digitalLifeFrame: null,
        },
      } as any,
      performanceState,
    } as any)

    expect((snapshot as any).activeVoice).toEqual({
      active: true,
      phase: 'playing',
      segmentId: 'segment-vrm-visible-voice-only-1',
    })
  })

  it('falls back to speech render cue and frame authority for vrm visible voice execution when the playback item segment id is absent', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.activeCue = {
      id: 'segment-vrm-visible-voice-fallback-line',
      index: 0,
      startOffset: 0,
      endOffset: 12,
      text: '我还沿着这一条线发声。',
      emotion: 'thinking',
      gestureWeight: 0.22,
      facialWeight: 0.4,
      prosodyWeight: 0.24,
      beatWeight: 0.18,
      mouthWeight: 0.2,
      headWeight: 0.18,
      facialHoldMs: 320,
      actionHoldMs: 260,
      emotionHoldMs: 340,
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'repair-before-closeness',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 340,
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 300,
        vrmExpressionBlendMs: 360,
      },
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      speechRenderState: {
        active: true,
        phase: 'playing',
        playbackPhase: 'playing',
        revision: 4,
        item: {
          intentId: 'intent-vrm-visible-voice-fallback',
          streamId: 'stream-vrm-visible-voice-fallback',
          segmentId: null,
          ownerId: 'alice',
          text: '我还沿着这一条线发声。',
          special: null,
          continuityHoldMs: 300,
          playbackDurationMs: 240,
          cue: {
            ...performanceState.activeCue,
            id: '   ',
          },
          metadata: null,
          digitalLifeFrame: {
            id: 'segment-vrm-visible-voice-fallback-line',
          },
        },
      } as any,
      performanceState,
    } as any)

    expect((snapshot as any).activeVoice).toEqual({
      active: true,
      phase: 'playing',
      segmentId: 'segment-vrm-visible-voice-fallback-line',
    })
  })

  it('prefers the active segment cue living line over a stale performance segment id in vrm execution diagnostics', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.performance.actionCue = 'StillnessGuard'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeActionCue = 'StillnessGuard'
    performanceState.activeCue = {
      id: 'segment-stale-performance-shell',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '先不要突然贴近。',
      emotion: 'thinking',
      gestureWeight: 0.18,
      facialWeight: 0.36,
      prosodyWeight: 0.22,
      beatWeight: 0.18,
      mouthWeight: 0.18,
      headWeight: 0.18,
      facialHoldMs: 280,
      actionHoldMs: 240,
      emotionHoldMs: 320,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'normal',
        preferredGazeMode: 'steady',
        residentMode: 'dialogue',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 220,
        live2dMotionFollowThroughMs: 260,
        vrmActionFadeMs: 220,
        vrmExpressionBlendMs: 240,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-vrm-performance-authority',
      streamId: 'stream-vrm-performance-authority',
      segmentId: 'segment-stale-performance-shell',
      ownerId: 'alice',
      text: '我先沿着这条线稳住。',
      special: null,
      continuityHoldMs: 320,
      playbackDurationMs: 260,
      metadata: null,
      cue: {
        ...performanceState.activeCue,
        id: 'segment-current-performance-living-line',
        facialCue: 'soft-gaze',
        actionCue: 'StillnessGuard',
        rendererHints: {
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          residentMode: 'repair-before-closeness',
        },
        rendererSettle: {
          live2dFacialReleaseMs: 360,
          live2dMotionFollowThroughMs: 420,
          vrmActionFadeMs: 340,
          vrmExpressionBlendMs: 380,
        },
      },
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-stale-performance-shell',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'face', 'motion'],
      sources: ['segment-carry'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: false,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentBody: {
        settle: 0.88,
        openness: 0.34,
      },
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['recoversoft'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'StillnessGuard',
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.35,
      },
      performanceState,
    })

    expect(snapshot.activeEmotion?.segmentId).toBe('segment-current-performance-living-line')
    expect(snapshot.activeFacialCue?.segmentId).toBe('segment-current-performance-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-current-performance-living-line')
    expect(snapshot.activeBody?.segmentId).toBe('segment-current-performance-living-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-current-performance-living-line')
  })

  it('keeps the aligned active segment living line over a stale cue shell in vrm execution diagnostics', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.performance.actionCue = 'StillnessGuard'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeActionCue = 'StillnessGuard'
    performanceState.activeCue = {
      id: 'segment-current-living-line',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '我先沿着这条线稳住。',
      emotion: 'thinking',
      gestureWeight: 0.18,
      facialWeight: 0.36,
      prosodyWeight: 0.22,
      beatWeight: 0.18,
      mouthWeight: 0.18,
      headWeight: 0.18,
      facialHoldMs: 280,
      actionHoldMs: 240,
      emotionHoldMs: 320,
      facialCue: 'focus',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'normal',
        preferredGazeMode: 'steady',
        residentMode: 'dialogue',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 220,
        live2dMotionFollowThroughMs: 260,
        vrmActionFadeMs: 220,
        vrmExpressionBlendMs: 240,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-vrm-stale-cue-shell',
      streamId: 'stream-vrm-stale-cue-shell',
      segmentId: 'segment-current-living-line',
      ownerId: 'alice',
      text: '我先沿着这条线稳住。',
      special: null,
      continuityHoldMs: 320,
      playbackDurationMs: 260,
      metadata: null,
      cue: {
        id: 'turn-vrm-stale-cue-shell:0',
      } as any,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-current-living-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildVrmExecutionDiagnosticsSnapshot({
      currentEmotion: 'thinking',
      currentEmotionResolvedExpressionNames: ['calm'],
      currentFacialCue: 'soft-gaze',
      currentFacialCueAffectsMouth: false,
      currentMotion: {
        cue: 'ObserveSoft',
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'ih',
        dominantWeight: 0.42,
      },
      speechRenderState: {
        active: true,
        phase: 'playing',
        playbackPhase: 'playing',
        item: {
          intentId: 'intent-vrm-stale-cue-shell',
          streamId: 'stream-vrm-stale-cue-shell',
          segmentId: 'segment-current-living-line',
          ownerId: 'alice',
          text: '我先沿着这条线稳住。',
          special: null,
          continuityHoldMs: 220,
          playbackDurationMs: 220,
          cue: {
            id: 'turn-vrm-stale-cue-shell:0',
          } as any,
          metadata: null,
          digitalLifeFrame: null,
        },
      } as any,
      performanceState,
    })

    expect(snapshot.activeEmotion?.segmentId).toBe('segment-current-living-line')
    expect(snapshot.activeFacialCue?.segmentId).toBe('segment-current-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-current-living-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-current-living-line')
    expect(snapshot.activeVoice?.segmentId).toBe('segment-current-living-line')
  })
})
