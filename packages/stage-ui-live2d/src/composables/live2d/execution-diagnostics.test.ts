import {
  createIdleStageEmbodimentPerformanceState,
  createIdleStageEmbodimentSpeechRenderState,
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
      activeLipSync: null,
      activeMotion: null,
      activeBody: null,
      activeVoice: null,
      cue: null,
    })
  })

  it('captures the applied chinese-first expression selection and effective settle timings', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'focus'
    performanceState.activeFacialCue = 'focus'
    performanceState.driverAuthority = {
      segmentId: 'segment-zh-focus-1',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }
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
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 440,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentBody: {
        settle: 0.84,
        openness: 0.42,
      },
      currentMotion: {
        group: 'ObserveSoft',
        index: 1,
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'A',
        dominantWeight: 0.73,
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
      activeBody: {
        settle: 0.84,
        openness: 0.42,
        segmentId: 'segment-zh-focus-1',
      },
      activeLipSync: {
        active: true,
        dominantViseme: 'A',
        dominantWeight: 0.73,
        segmentId: 'segment-zh-focus-1',
      },
      activeVoice: null,
      cue: {
        emotion: 'thinking',
        facialCue: 'focus',
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        reasonTags: [],
        signature: null,
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
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'ObserveSoft',
        index: 1,
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'E',
        dominantWeight: 0.51,
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
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-driver-runtime-1')
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
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'StillnessGuard',
        index: 2,
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'I',
        dominantWeight: 0.38,
      },
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.4,
      },
    })

    expect(snapshot.activeExpression?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: [],
      signature: null,
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 420,
    })
  })

  it('prefers the active segment cue living line over a stale performance segment id in live2d execution diagnostics', () => {
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
      segmentId: 'segment-stale-performance-shell',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 280,
      metadata: null,
      cue: {
        id: 'segment-later-living-line',
      } as any,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-stale-performance-shell',
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'StillnessGuard',
        index: 2,
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'I',
        dominantWeight: 0.38,
      },
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.4,
      },
    })

    expect(snapshot.activeExpression?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-later-living-line')
  })

  it('falls back to the active segment digital-life frame living line before a stale performance segment id in live2d execution diagnostics', () => {
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
      segmentId: 'segment-stale-performance-shell',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 280,
      metadata: null,
      cue: {
        id: '   ',
      } as any,
      digitalLifeFrame: {
        id: 'segment-live2d-frame-line',
      } as any,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-stale-performance-shell',
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'StillnessGuard',
        index: 2,
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'I',
        dominantWeight: 0.38,
      },
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.4,
      },
    })

    expect(snapshot.activeExpression?.segmentId).toBe('segment-live2d-frame-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-live2d-frame-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-live2d-frame-line')
  })

  it('keeps the aligned active segment living line over a stale cue shell in live2d execution diagnostics', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-current-living-line',
      index: 0,
      startOffset: 0,
      endOffset: 6,
      text: '继续看这里。',
      emotion: 'thinking',
      gestureWeight: 0.3,
      facialWeight: 0.56,
      prosodyWeight: 0.34,
      beatWeight: 0.3,
      mouthWeight: 0.22,
      headWeight: 0.26,
      facialHoldMs: 340,
      actionHoldMs: 280,
      emotionHoldMs: 340,
      actionCue: 'steady_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'measured-return',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        preferredExpressionAliases: ['RecoverSoft'],
      },
      rendererSettle: {
        live2dFacialReleaseMs: 360,
        live2dMotionFollowThroughMs: 440,
        vrmExpressionBlendMs: 380,
        vrmActionFadeMs: 300,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-live2d-stale-cue-shell',
      streamId: 'stream-live2d-stale-cue-shell',
      segmentId: 'segment-current-living-line',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 220,
      metadata: null,
      cue: {
        id: 'turn-live2d-stale-cue-shell:0',
      } as any,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-current-living-line',
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'StillnessGuard',
        index: 2,
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'I',
        dominantWeight: 0.38,
      },
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.4,
      },
      speechRenderState: {
        ...createIdleStageEmbodimentSpeechRenderState(),
        active: true,
        phase: 'playing',
        playbackPhase: 'playing',
        item: {
          intentId: 'intent-live2d-stale-cue-shell',
          streamId: 'stream-live2d-stale-cue-shell',
          segmentId: 'segment-current-living-line',
          ownerId: 'alice',
          text: '继续看这里。',
          special: null,
          continuityHoldMs: 220,
          playbackDurationMs: 220,
          cue: {
            id: 'turn-live2d-stale-cue-shell:0',
          } as any,
          metadata: null,
          digitalLifeFrame: null,
        },
      } as any,
    })

    expect(snapshot.activeExpression?.segmentId).toBe('segment-current-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-current-living-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-current-living-line')
    expect(snapshot.activeVoice?.segmentId).toBe('segment-current-living-line')
  })

  it('keeps a still-playing live2d motion pinned to the segment that actually started it even after later authority metadata arrives', () => {
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
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'ObserveSoft',
        index: 1,
        segmentId: 'segment-earlier-shell',
      } as any,
      currentLipSync: {
        active: true,
        dominantViseme: 'I',
        dominantWeight: 0.38,
      },
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.4,
      },
    })

    expect(snapshot.activeExpression?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-earlier-shell')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: [],
      signature: null,
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 420,
    })
  })

  it('keeps a still-carry live2d mouth proof pinned to the segment that actually started it even after later authority metadata arrives', () => {
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
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'StillnessGuard',
        index: 1,
      },
      currentLipSync: {
        active: false,
        dominantViseme: 'closed',
        dominantWeight: 0.22,
        segmentId: 'segment-earlier-shell',
      } as any,
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.4,
      },
    })

    expect(snapshot.activeExpression?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeMotion?.segmentId).toBe('segment-later-living-line')
    expect(snapshot.activeLipSync?.segmentId).toBe('segment-earlier-shell')
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard'],
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: [],
      signature: null,
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 420,
    })
  })

  it('keeps cadence-aware follow-through cue context visible after live2d motion outlives the cleared active cue', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = null
    performanceState.activeSegment = null
    performanceState.driverAuthority = null

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'StillnessGuard',
        index: 2,
        segmentId: 'segment-live2d-follow-through-1',
        cue: {
          id: 'segment-live2d-follow-through-1',
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
            reasonTags: ['audit:renderer-only'],
            signature: 'renderer audit text',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 380,
            live2dMotionFollowThroughMs: 560,
          },
        },
      } as any,
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: null,
    })

    expect(snapshot.activeExpression).toBeNull()
    expect(snapshot.activeMotion).toEqual({
      group: 'StillnessGuard',
      index: 2,
      segmentId: 'segment-live2d-follow-through-1',
    })
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      reasonTags: ['audit:renderer-only'],
      signature: 'renderer audit text',
      live2dFacialReleaseMs: 380,
      live2dMotionFollowThroughMs: 560,
    })
  })

  it('keeps measured-return companionship dialect visible in live2d cue diagnostics alongside settle timings', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-live2d-measured-return-cue-1',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '我先慢一点收回来。',
      emotion: 'thinking',
      gestureWeight: 0.18,
      facialWeight: 0.44,
      prosodyWeight: 0.24,
      beatWeight: 0.18,
      mouthWeight: 0.28,
      headWeight: 0.18,
      facialHoldMs: 360,
      actionHoldMs: 280,
      emotionHoldMs: 320,
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      actionWindow: 'none',
      interruptMode: 'soft-interrupt',
      settleMode: 'linger',
      rendererHints: {
        residentMode: 'measured-return',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['steady_focus'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 620,
        live2dMotionFollowThroughMs: 540,
        vrmActionFadeMs: 330,
        vrmExpressionBlendMs: 410,
      },
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'SteadyFocus',
        index: 0,
      },
      currentLipSync: {
        active: false,
        dominantViseme: 'A',
        dominantWeight: 0.32,
      },
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 10.8,
      },
    })

    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['steady_focus'],
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: [],
      signature: null,
      live2dFacialReleaseMs: 620,
      live2dMotionFollowThroughMs: 540,
    })
  })

  it('keeps repair-first companionship authority visible in live2d cue diagnostics when stronger aliases and quieter blink/gaze are active', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-live2d-repair-first-cue-1',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '这一拍我先收稳。',
      emotion: 'thinking',
      gestureWeight: 0.16,
      facialWeight: 0.42,
      prosodyWeight: 0.22,
      beatWeight: 0.16,
      mouthWeight: 0.24,
      headWeight: 0.18,
      facialHoldMs: 380,
      actionHoldMs: 300,
      emotionHoldMs: 360,
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      actionWindow: 'none',
      interruptMode: 'soft-interrupt',
      settleMode: 'linger',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['recover-soft', 'soft-gaze'],
        preferredMotionAliases: ['stillness_guard', 'observe_focus'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 420,
        live2dMotionFollowThroughMs: 560,
        vrmActionFadeMs: 320,
        vrmExpressionBlendMs: 420,
      },
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'stillness_guard',
        index: 2,
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'I',
        dominantWeight: 0.48,
      },
      performanceState,
      preferredExpressionAliases: ['recover-soft', 'soft-gaze'],
      selection: {
        name: 'recover-soft',
        reason: 'preferred',
        score: 13.2,
      },
    })

    expect(snapshot).toEqual({
      activeExpression: {
        name: 'recover-soft',
        reason: 'preferred',
        score: 13.2,
        segmentId: 'segment-live2d-repair-first-cue-1',
      },
      activeMotion: {
        group: 'stillness_guard',
        index: 2,
        segmentId: 'segment-live2d-repair-first-cue-1',
      },
      activeBody: null,
      activeLipSync: {
        active: true,
        dominantViseme: 'I',
        dominantWeight: 0.48,
        segmentId: 'segment-live2d-repair-first-cue-1',
      },
      activeVoice: null,
      cue: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        preferredExpressionAliases: ['recover-soft', 'soft-gaze'],
        preferredMotionAliases: ['stillness_guard', 'observe_focus'],
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonTags: [],
        signature: null,
        live2dFacialReleaseMs: 420,
        live2dMotionFollowThroughMs: 560,
      },
    })
  })

  it('keeps live2d diagnostics renderer-coherent when face motion and lipsync have rejoined but body authority is still withheld', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.performance.actionCue = 'observe_soft'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeActionCue = 'observe_soft'
    performanceState.activeCue = {
      id: 'segment-live2d-restrained-renderer-only',
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
      intentId: 'intent-live2d-restrained-renderer-only',
      streamId: 'stream-live2d-restrained-renderer-only',
      segmentId: 'segment-live2d-restrained-renderer-only',
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
      segmentId: 'segment-live2d-restrained-renderer-only',
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentBody: {
        settle: 0.8,
        openness: 0.49,
      },
      currentMotion: {
        group: 'ObserveSoft',
        index: 1,
      },
      currentLipSync: {
        active: true,
        dominantViseme: 'I',
        dominantWeight: 0.31,
      },
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.2,
      },
    })

    expect(snapshot.activeExpression).toEqual({
      name: 'RecoverSoft',
      reason: 'preferred',
      score: 12.2,
      segmentId: 'segment-live2d-restrained-renderer-only',
    })
    expect(snapshot.activeMotion).toEqual({
      group: 'ObserveSoft',
      index: 1,
      segmentId: 'segment-live2d-restrained-renderer-only',
    })
    expect(snapshot.activeLipSync).toEqual({
      active: true,
      dominantViseme: 'I',
      dominantWeight: 0.31,
      segmentId: 'segment-live2d-restrained-renderer-only',
    })
    expect(snapshot.activeBody).toBeNull()
    expect(snapshot.cue).toEqual({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['ObserveSoft'],
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonTags: [],
      signature: null,
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 420,
    })
  })

  it('keeps live2d visible execution on the same inward callback line when body-face-motion have already rejoined and lipsync voice are still the remaining-open seam', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-live2d-body-face-motion-rejoined-1',
      index: 0,
      startOffset: 0,
      endOffset: 16,
      text: '我先顺着已经接住的身体线，慢慢把声音带回来。',
      emotion: 'thinking',
      gestureWeight: 0.18,
      facialWeight: 0.46,
      prosodyWeight: 0.24,
      beatWeight: 0.16,
      mouthWeight: 0.3,
      headWeight: 0.2,
      facialHoldMs: 380,
      actionHoldMs: 300,
      emotionHoldMs: 360,
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      settleMode: 'linger',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 380,
        live2dMotionFollowThroughMs: 460,
        vrmActionFadeMs: 320,
        vrmExpressionBlendMs: 380,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-live2d-body-face-motion-rejoined-1',
      ownerId: 'alice',
      text: '我先顺着已经接住的身体线，慢慢把声音带回来。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 260,
      metadata: null,
      cue: performanceState.activeCue,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-live2d-body-face-motion-rejoined-1',
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion'],
      sources: ['segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: false,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'StillnessGuard',
        index: 0,
      },
      currentLipSync: {
        active: false,
        dominantViseme: 'closed',
        dominantWeight: 0.22,
      },
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.6,
      },
      speechRenderState: {
        ...createIdleStageEmbodimentSpeechRenderState(),
        active: true,
        phase: 'playing',
        playbackPhase: 'playing',
        revision: 7,
        item: {
          intentId: 'intent-1',
          streamId: 'stream-1',
          segmentId: 'segment-live2d-body-face-motion-rejoined-1',
          ownerId: 'alice',
          text: '我先顺着已经接住的身体线，慢慢把声音带回来。',
          special: null,
          continuityHoldMs: 340,
          playbackDurationMs: 260,
          cue: performanceState.activeCue,
          metadata: null,
          digitalLifeFrame: null,
        },
      },
    })

    expect(snapshot).toEqual({
      activeExpression: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.6,
        segmentId: 'segment-live2d-body-face-motion-rejoined-1',
      },
      activeMotion: {
        group: 'StillnessGuard',
        index: 0,
        segmentId: 'segment-live2d-body-face-motion-rejoined-1',
      },
      activeBody: null,
      activeLipSync: {
        active: false,
        dominantViseme: 'closed',
        dominantWeight: 0.22,
        segmentId: 'segment-live2d-body-face-motion-rejoined-1',
      },
      activeVoice: {
        active: true,
        phase: 'playing',
        segmentId: 'segment-live2d-body-face-motion-rejoined-1',
      },
      cue: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonTags: [],
        signature: null,
        live2dFacialReleaseMs: 380,
        live2dMotionFollowThroughMs: 460,
      },
    })
  })

  it('falls back to speech render cue and frame authority for live2d visible voice execution when the playback item segment id is absent', () => {
    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'cooldown'
    performanceState.performance.baseEmotion = 'thinking'
    performanceState.performance.facialCue = 'soft-gaze'
    performanceState.activeFacialCue = 'soft-gaze'
    performanceState.activeCue = {
      id: 'segment-live2d-visible-voice-shell',
      index: 0,
      startOffset: 0,
      endOffset: 16,
      text: '我先顺着声音线把你接住。',
      emotion: 'thinking',
      gestureWeight: 0.18,
      facialWeight: 0.46,
      prosodyWeight: 0.24,
      beatWeight: 0.16,
      mouthWeight: 0.3,
      headWeight: 0.2,
      facialHoldMs: 380,
      actionHoldMs: 300,
      emotionHoldMs: 360,
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      settleMode: 'linger',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 380,
        live2dMotionFollowThroughMs: 460,
        vrmActionFadeMs: 320,
        vrmExpressionBlendMs: 380,
      },
    }
    performanceState.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-live2d-visible-voice-shell',
      ownerId: 'alice',
      text: '我先顺着声音线把你接住。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 260,
      metadata: null,
      cue: performanceState.activeCue,
      digitalLifeFrame: null,
    }
    performanceState.driverAuthority = {
      segmentId: 'segment-live2d-visible-voice-shell',
      rendererTarget: 'live2d',
      matchedDrivers: ['face', 'motion'],
      sources: ['segment-carry'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: false,
    }

    const snapshot = buildLive2DExecutionDiagnosticsSnapshot({
      currentMotion: {
        group: 'StillnessGuard',
        index: 0,
      },
      currentLipSync: {
        active: false,
        dominantViseme: 'closed',
        dominantWeight: 0.22,
      },
      performanceState,
      preferredExpressionAliases: ['RecoverSoft'],
      selection: {
        name: 'RecoverSoft',
        reason: 'preferred',
        score: 12.6,
      },
      speechRenderState: {
        ...createIdleStageEmbodimentSpeechRenderState(),
        active: true,
        phase: 'playing',
        playbackPhase: 'playing',
        revision: 7,
        item: {
          intentId: 'intent-1',
          streamId: 'stream-1',
          segmentId: null,
          ownerId: 'alice',
          text: '我先顺着声音线把你接住。',
          special: null,
          continuityHoldMs: 340,
          playbackDurationMs: 260,
          cue: {
            ...performanceState.activeCue,
            id: '   ',
          },
          metadata: null,
          digitalLifeFrame: {
            id: 'segment-live2d-visible-voice-line',
          },
        },
      } as any,
    })

    expect(snapshot.activeVoice).toEqual({
      active: true,
      phase: 'playing',
      segmentId: 'segment-live2d-visible-voice-line',
    })
  })
})
