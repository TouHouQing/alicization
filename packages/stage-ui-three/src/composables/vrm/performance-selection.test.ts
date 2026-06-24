import {
  createIdleStageEmbodimentPerformanceState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  resolveVrmDialogueExpressionWatchKey,
  resolveVrmDialoguePerformanceFromState,
  resolveVrmPreferredActionBinding,
  resolveVrmPreferredCustomExpressionBinding,
} from './performance-selection'

describe('vrm performance selection', () => {
  it('prefers active segment-authored cues over base performance cues', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'happy'
    state.performance.emphasis = 2
    state.performance.facialCue = 'resident_smile'
    state.performance.actionCue = 'resident_nod'
    state.activeFacialCue = 'segment_focus'
    state.activeFacialCueSource = 'segment'
    state.activeActionCue = 'segment_bow'
    state.activeActionCueSource = 'segment'

    expect(resolveVrmDialoguePerformanceFromState(state)).toEqual({
      actionCue: 'segment_bow',
      baseEmotion: 'happy',
      emphasis: 2,
      facialCue: 'segment_focus',
    })
  })

  it('falls back to base performance cues when no active cue is present', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'armed'
    state.performance.baseEmotion = 'concerned'
    state.performance.emphasis = 1
    state.performance.facialCue = 'resident_soft_gaze'
    state.performance.actionCue = 'resident_settle'

    expect(resolveVrmDialoguePerformanceFromState(state)).toEqual({
      actionCue: 'resident_settle',
      baseEmotion: 'concerned',
      emphasis: 1,
      facialCue: 'resident_soft_gaze',
    })
  })

  it('returns null while the performance state is idle', () => {
    expect(resolveVrmDialoguePerformanceFromState(
      createIdleStageEmbodimentPerformanceState(),
    )).toBeNull()
  })

  it('changes the expression watch key when the active facial cue changes even if the base cue does not', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'happy'
    state.performance.emphasis = 2
    state.performance.facialCue = 'resident_smile'
    state.activeFacialCue = 'segment_focus'
    state.expressionIntensity = 0.9
    state.facialCueIntensity = 0.8
    state.motor.expressivity = 0.64
    state.motor.facial.cheekLift = 0.22
    state.motor.facial.browTension = 0.18
    state.motor.facial.eyeOpenness = 0.58
    state.motor.stillness = 0.36

    const segmentKey = resolveVrmDialogueExpressionWatchKey(state)

    state.activeFacialCue = 'segment_reassure'
    const updatedSegmentKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(updatedSegmentKey).not.toBe(segmentKey)
    expect(updatedSegmentKey).toContain('segment_reassure')
    expect(updatedSegmentKey).not.toContain('resident_smile')
  })

  it('changes the expression watch key when companionship resident micro-state changes even if the facial cue stays the same', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'thinking'
    state.performance.facialCue = 'soft-gaze'
    state.activeFacialCue = 'soft-gaze'
    state.activeCue = {
      id: 'segment-vrm-resident-watch',
      index: 0,
      startOffset: 0,
      endOffset: 4,
      text: '继续看',
      emotion: 'thinking',
      gestureWeight: 0.4,
      facialWeight: 0.6,
      prosodyWeight: 0.5,
      beatWeight: 0.4,
      mouthWeight: 0.3,
      headWeight: 0.4,
      facialHoldMs: 320,
      actionHoldMs: 220,
      emotionHoldMs: 320,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'measured-return',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    }

    const measuredReturnKey = resolveVrmDialogueExpressionWatchKey(state)

    state.activeCue = {
      ...state.activeCue,
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'quiet',
      },
    }

    const repairKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(repairKey).not.toBe(measuredReturnKey)
    expect(measuredReturnKey).toContain('measured-return')
    expect(repairKey).toContain('repair-before-closeness')
    expect(repairKey).toContain('quiet')
  })

  it('changes the expression watch key when later segment authority changes even if facial cue and resident micro-state stay the same', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'thinking'
    state.performance.facialCue = 'soft-gaze'
    state.activeFacialCue = 'soft-gaze'
    state.expressionIntensity = 0.82
    state.facialCueIntensity = 0.76
    state.motor.expressivity = 0.58
    state.motor.facial.cheekLift = 0.16
    state.motor.facial.browTension = 0.22
    state.motor.facial.eyeOpenness = 0.56
    state.motor.stillness = 0.42
    state.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-earlier-shell',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 220,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    state.activeCue = {
      id: 'driver:继续看这里。',
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

    const earlierKey = resolveVrmDialogueExpressionWatchKey(state)

    state.activeSegment = {
      ...state.activeSegment,
      segmentId: 'segment-later-living-line',
    }
    state.activeCue = {
      ...state.activeCue,
      rendererHints: {
        ...state.activeCue.rendererHints,
        preferredExpressionAliases: ['CalmInspect'],
      },
    }

    const laterKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(laterKey).not.toBe(earlierKey)
    expect(earlierKey).toContain('segment-earlier-shell')
    expect(laterKey).toContain('segment-later-living-line')
    expect(earlierKey).toContain('RecoverSoft')
    expect(laterKey).toContain('CalmInspect')
  })

  it('prefers the active segment cue living line over a stale performance segment id in the expression watch key', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'thinking'
    state.performance.facialCue = 'soft-gaze'
    state.activeFacialCue = 'soft-gaze'
    state.expressionIntensity = 0.82
    state.facialCueIntensity = 0.76
    state.motor.expressivity = 0.58
    state.motor.facial.cheekLift = 0.16
    state.motor.facial.browTension = 0.22
    state.motor.facial.eyeOpenness = 0.56
    state.motor.stillness = 0.42
    state.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-stale-performance-shell',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 220,
      metadata: null,
      cue: {
        id: 'segment-current-living-line',
      } as any,
      digitalLifeFrame: null,
    }
    state.activeCue = {
      id: 'segment-stale-performance-shell',
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

    const watchKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(watchKey).toContain('segment-current-living-line')
    expect(watchKey).not.toContain('segment-stale-performance-shell')
  })

  it('falls back to the active segment digital-life frame living line before a stale performance segment id in the expression watch key', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'thinking'
    state.performance.facialCue = 'soft-gaze'
    state.activeFacialCue = 'soft-gaze'
    state.expressionIntensity = 0.82
    state.facialCueIntensity = 0.76
    state.motor.expressivity = 0.58
    state.motor.facial.cheekLift = 0.16
    state.motor.facial.browTension = 0.22
    state.motor.facial.eyeOpenness = 0.56
    state.motor.stillness = 0.42
    state.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-stale-performance-shell',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 220,
      metadata: null,
      cue: {
        id: '   ',
      } as any,
      digitalLifeFrame: {
        id: 'segment-current-frame-line',
      } as any,
    }
    state.activeCue = {
      id: 'segment-stale-performance-shell',
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

    const watchKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(watchKey).toContain('segment-current-frame-line')
    expect(watchKey).not.toContain('segment-stale-performance-shell')
  })

  it('keeps the aligned active segment living line over a stale cue shell in the expression watch key', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'thinking'
    state.performance.facialCue = 'soft-gaze'
    state.activeFacialCue = 'soft-gaze'
    state.expressionIntensity = 0.82
    state.facialCueIntensity = 0.76
    state.motor.expressivity = 0.58
    state.motor.facial.cheekLift = 0.16
    state.motor.facial.browTension = 0.22
    state.motor.facial.eyeOpenness = 0.56
    state.motor.stillness = 0.42
    state.activeSegment = {
      intentId: 'intent-vrm-stale-cue-shell-watch',
      streamId: 'stream-vrm-stale-cue-shell-watch',
      segmentId: 'segment-current-living-line',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 220,
      metadata: null,
      cue: {
        id: 'turn-vrm-stale-cue-shell:0',
      } as any,
      digitalLifeFrame: null,
    }
    state.activeCue = {
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

    const watchKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(watchKey).toContain('segment-current-living-line')
    expect(watchKey).not.toContain('turn-vrm-stale-cue-shell:0')
  })

  it('changes the expression watch key when vrm expression blend timing changes even if the alias set stays the same', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'thinking'
    state.performance.facialCue = 'soft-gaze'
    state.activeFacialCue = 'soft-gaze'
    state.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-vrm-settle-timing',
      ownerId: 'alice',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 220,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    state.activeCue = {
      id: 'segment-vrm-settle-timing',
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
        preferredExpressionAliases: ['CalmInspect'],
      },
      rendererSettle: {
        live2dFacialReleaseMs: 360,
        live2dMotionFollowThroughMs: 440,
        vrmExpressionBlendMs: 320,
        vrmActionFadeMs: 260,
      },
    }

    const initialKey = resolveVrmDialogueExpressionWatchKey(state)

    state.activeCue = {
      ...state.activeCue,
      rendererSettle: {
        ...state.activeCue.rendererSettle,
        vrmExpressionBlendMs: 420,
      },
    }

    const updatedKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(updatedKey).not.toBe(initialKey)
    expect(initialKey).toContain('320')
    expect(updatedKey).toContain('420')
    expect(updatedKey).toContain('CalmInspect')
  })

  it('changes the expression watch key when same-her audible-return continuity becomes explicit even if resident mode and aliases stay on the same measured-return family', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'thinking'
    state.performance.facialCue = 'soft-gaze'
    state.activeFacialCue = 'soft-gaze'
    state.activeSegment = {
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-vrm-same-her-watch',
      ownerId: 'alice',
      text: '我还在这条线上。',
      special: null,
      continuityHoldMs: 360,
      playbackDurationMs: 240,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    state.activeCue = {
      id: 'segment-vrm-same-her-watch',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '我还在这条线上。',
      emotion: 'thinking',
      gestureWeight: 0.28,
      facialWeight: 0.54,
      prosodyWeight: 0.34,
      beatWeight: 0.3,
      mouthWeight: 0.2,
      headWeight: 0.24,
      facialHoldMs: 360,
      actionHoldMs: 300,
      emotionHoldMs: 360,
      actionCue: 'steady_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'measured-return',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        preferredExpressionAliases: ['CalmInspect'],
      },
      rendererSettle: {
        live2dFacialReleaseMs: 360,
        live2dMotionFollowThroughMs: 440,
        vrmExpressionBlendMs: 360,
        vrmActionFadeMs: 280,
      },
    }

    const ordinaryMeasuredReturnKey = resolveVrmDialogueExpressionWatchKey(state)

    state.activeCue = {
      ...state.activeCue,
      rendererHints: {
        ...state.activeCue.rendererHints,
        signature: 'embodiment:audible-same-her-line',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      },
    }

    const audibleSameHerKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(audibleSameHerKey).not.toBe(ordinaryMeasuredReturnKey)
    expect(audibleSameHerKey).toContain('embodiment:audible-same-her-line')
    expect(audibleSameHerKey).toContain('embodiment:body-lipsync-voice-rejoin')
  })

  it('prefers active cue expression aliases over direct facial cue key when resolving custom VRM expression bindings', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeFacialCue = 'focused'
    state.activeCue = {
      id: 'segment-vrm-alias',
      index: 0,
      startOffset: 0,
      endOffset: 4,
      text: '继续看',
      emotion: 'thinking',
      gestureWeight: 0.4,
      facialWeight: 0.6,
      prosodyWeight: 0.5,
      beatWeight: 0.4,
      mouthWeight: 0.3,
      headWeight: 0.4,
      facialHoldMs: 320,
      actionHoldMs: 220,
      emotionHoldMs: 320,
      actionCue: 'observe_focus',
      facialCue: 'focused',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
      },
    }

    const bindings = [
      {
        expressionName: 'CalmInspect',
        facialKey: 'custom_focus_variant',
        label: 'Calm Inspect',
        description: 'Model-specific focus expression',
        affectsMouth: false,
        source: 'custom' as const,
      },
      {
        expressionName: 'focused',
        facialKey: 'focused',
        label: 'Focused',
        description: 'Direct focused binding',
        affectsMouth: false,
        source: 'custom' as const,
      },
    ]

    expect(resolveVrmPreferredCustomExpressionBinding(state, bindings)?.expressionName).toBe('CalmInspect')
  })

  it('prefers active cue motion aliases over the direct action key when resolving VRM action bindings', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-motion-alias',
      index: 0,
      startOffset: 0,
      endOffset: 4,
      text: '继续看',
      emotion: 'thinking',
      gestureWeight: 0.4,
      facialWeight: 0.6,
      prosodyWeight: 0.5,
      beatWeight: 0.4,
      mouthWeight: 0.3,
      headWeight: 0.4,
      facialHoldMs: 320,
      actionHoldMs: 220,
      emotionHoldMs: 320,
      actionCue: 'observe_focus',
      facialCue: 'focused',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredMotionAliases: ['ObserveSoft'],
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus',
        fileName: 'observe-focus.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'alias-observe-soft',
        fileName: 'observe-soft.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Alias-backed motion binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('ObserveSoft')
  })

  it('keeps repair-first expression alias authority even when calmer fallback bindings appear earlier in the registry', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeFacialCue = 'soft-gaze'
    state.activeCue = {
      id: 'segment-vrm-repair-first-expression-authority',
      index: 0,
      startOffset: 0,
      endOffset: 5,
      text: '先收回来一点。',
      emotion: 'thinking',
      gestureWeight: 0.3,
      facialWeight: 0.6,
      prosodyWeight: 0.5,
      beatWeight: 0.3,
      mouthWeight: 0.2,
      headWeight: 0.3,
      facialHoldMs: 340,
      actionHoldMs: 260,
      emotionHoldMs: 340,
      actionCue: 'steady_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
    }

    const bindings = [
      {
        expressionName: 'CalmInspect',
        facialKey: 'calm_inspect',
        label: 'Calm Inspect',
        description: 'Softer measured-return fallback expression',
        affectsMouth: false,
        source: 'custom' as const,
      },
      {
        expressionName: 'RecoverSoft',
        facialKey: 'recover_soft',
        label: 'Recover Soft',
        description: 'Repair-first guarded expression',
        affectsMouth: false,
        source: 'custom' as const,
      },
    ]

    expect(resolveVrmPreferredCustomExpressionBinding(state, bindings)?.expressionName).toBe('RecoverSoft')
  })

  it('prefers softer same-her expression bindings when same-thread quieter body+lipsync-only carry is still the surviving living line', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.facialCue = 'warm_smile'
    state.activeFacialCue = 'warm_smile'
    state.activeCue = {
      id: 'segment-vrm-quieter-body-lipsync-expression',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '先沿着这条线轻一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.22,
      facialWeight: 0.44,
      prosodyWeight: 0.36,
      beatWeight: 0.2,
      mouthWeight: 0.18,
      headWeight: 0.2,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'warm_smile',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body+lipsync-only'],
      },
    }

    const bindings = [
      {
        expressionName: 'WarmSmile',
        facialKey: 'warm_smile',
        label: 'Warm Smile',
        description: 'Warmer outward smile binding',
        affectsMouth: false,
        source: 'custom' as const,
      },
      {
        expressionName: 'CalmInspect',
        facialKey: 'calm_inspect',
        label: 'Calm Inspect',
        description: 'Quieter same-line recovery expression',
        affectsMouth: false,
        source: 'custom' as const,
      },
    ]

    expect(resolveVrmPreferredCustomExpressionBinding(state, bindings)?.expressionName).toBe('CalmInspect')
  })

  it('prefers softer same-her expression bindings when same-thread body+voice-only carry is still the surviving living line', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.facialCue = 'warm_smile'
    state.activeFacialCue = 'warm_smile'
    state.activeCue = {
      id: 'segment-vrm-body-voice-only-expression',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '先沿着身体和声音这条线轻一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.22,
      facialWeight: 0.44,
      prosodyWeight: 0.36,
      beatWeight: 0.2,
      mouthWeight: 0.18,
      headWeight: 0.2,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'warm_smile',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      },
    }

    const bindings = [
      {
        expressionName: 'WarmSmile',
        facialKey: 'warm_smile',
        label: 'Warm Smile',
        description: 'Warmer outward smile binding',
        affectsMouth: false,
        source: 'custom' as const,
      },
      {
        expressionName: 'CalmInspect',
        facialKey: 'calm_inspect',
        label: 'Calm Inspect',
        description: 'Resident body+voice-only same-line recovery expression',
        affectsMouth: false,
        source: 'custom' as const,
      },
    ]

    expect(resolveVrmPreferredCustomExpressionBinding(state, bindings)?.expressionName).toBe('CalmInspect')
  })

  it('prefers softer same-her expression bindings when the still-voiced face line arrives through signature-only same-thread continuity', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.facialCue = 'warm_smile'
    state.activeFacialCue = 'warm_smile'
    state.activeCue = {
      id: 'segment-vrm-still-voiced-face-signature-expression',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '先沿着表情和声音还连着的线轻一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.22,
      facialWeight: 0.44,
      prosodyWeight: 0.36,
      beatWeight: 0.2,
      mouthWeight: 0.18,
      headWeight: 0.2,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'warm_smile',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredExpressionAliases: ['WarmSmile', 'CalmInspect'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-line',
      },
    }

    const bindings = [
      {
        expressionName: 'WarmSmile',
        facialKey: 'warm_smile',
        label: 'Warm Smile',
        description: 'Warmer outward smile binding',
        affectsMouth: false,
        source: 'custom' as const,
      },
      {
        expressionName: 'CalmInspect',
        facialKey: 'calm_inspect',
        label: 'Calm Inspect',
        description: 'Signature-only still-voiced same-line recovery expression',
        affectsMouth: false,
        source: 'custom' as const,
      },
    ]

    expect(resolveVrmPreferredCustomExpressionBinding(state, bindings)?.expressionName).toBe('CalmInspect')
  })

  it('keeps repair-first motion alias authority even when measured-return fallback bindings appear earlier in the registry', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-repair-first-motion-authority',
      index: 0,
      startOffset: 0,
      endOffset: 5,
      text: '先守住这一拍。',
      emotion: 'thinking',
      gestureWeight: 0.3,
      facialWeight: 0.6,
      prosodyWeight: 0.5,
      beatWeight: 0.3,
      mouthWeight: 0.2,
      headWeight: 0.3,
      facialHoldMs: 340,
      actionHoldMs: 260,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
    }

    const bindings = [
      {
        id: 'alias-observe-soft',
        fileName: 'observe-soft.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Measured-return fallback motion binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'alias-stillness-guard',
        fileName: 'stillness-guard.vrma',
        actionKey: 'StillnessGuard',
        label: 'Stillness Guard',
        description: 'Repair-first guarded motion binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('StillnessGuard')
  })

  it('keeps guarded vrm motion alias authority when renderer continuity has rejoined but body authority is still withheld', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-renderer-only-guarded-motion',
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
      actionCue: 'idle_settle',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
    }
    state.activeSegment = {
      intentId: 'intent-vrm-renderer-only-guarded-motion',
      streamId: 'stream-vrm-renderer-only-guarded-motion',
      segmentId: 'segment-vrm-renderer-only-guarded-motion',
      ownerId: 'alice',
      text: '先收回来一点。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 220,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    state.driverAuthority = {
      segmentId: 'segment-vrm-renderer-only-guarded-motion',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    }

    const bindings = [
      {
        id: 'alias-observe-soft',
        fileName: 'observe-soft.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Measured-return fallback motion binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'alias-stillness-guard',
        fileName: 'stillness-guard.vrma',
        actionKey: 'StillnessGuard',
        label: 'Stillness Guard',
        description: 'Repair-first guarded motion binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('StillnessGuard')
  })

  it('prefers softer same-her rejoin motion bindings over the direct action cue when measured-return audible continuity has already re-formed', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-audible-same-her-motion',
      index: 0,
      startOffset: 0,
      endOffset: 6,
      text: '继续慢一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.28,
      facialWeight: 0.52,
      prosodyWeight: 0.48,
      beatWeight: 0.26,
      mouthWeight: 0.22,
      headWeight: 0.24,
      facialHoldMs: 340,
      actionHoldMs: 280,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'measured-return',
        preferredMotionAliases: ['ObserveSoft', 'steady_focus'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus',
        fileName: 'observe-focus.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'soft-steady-focus',
        fileName: 'steady-focus.vrma',
        actionKey: 'steady_focus',
        label: 'Steady Focus',
        description: 'Softer same-her rejoin motion',
        importedAt: 2,
        source: 'builtin' as const,
      },
      {
        id: 'observe-soft',
        fileName: 'observe-soft.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Measured-return observe soft motion',
        importedAt: 3,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('ObserveSoft')
  })

  it('prefers softer same-her rejoin motion bindings even after residentMode relaxes to same-thread-continuation when structured audible carry is still present', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-audible-same-her-same-thread-motion',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '还是沿着同一条线慢一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.24,
      facialWeight: 0.48,
      prosodyWeight: 0.42,
      beatWeight: 0.22,
      mouthWeight: 0.2,
      headWeight: 0.22,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['ObserveSoft', 'steady_focus'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'embodiment:audible-same-her-line',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus',
        fileName: 'observe-focus.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'soft-steady-focus',
        fileName: 'steady-focus.vrma',
        actionKey: 'steady_focus',
        label: 'Steady Focus',
        description: 'Softer same-her rejoin motion',
        importedAt: 2,
        source: 'builtin' as const,
      },
      {
        id: 'observe-soft',
        fileName: 'observe-soft.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Same-thread same-her observe soft motion',
        importedAt: 3,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('ObserveSoft')
  })

  it('prefers softer same-her motion bindings when same-thread body+voice-only carry stays on the resident audible body line', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-body-voice-same-thread-motion',
      index: 0,
      startOffset: 0,
      endOffset: 9,
      text: '先沿着身体和声音这条线轻一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.24,
      facialWeight: 0.48,
      prosodyWeight: 0.42,
      beatWeight: 0.22,
      mouthWeight: 0.2,
      headWeight: 0.22,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['ObserveSoft', 'steady_focus'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'embodiment:audible_same_her_line',
        reasonTags: ['embodiment:body+voice-only'],
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus',
        fileName: 'observe-focus.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'soft-steady-focus',
        fileName: 'steady-focus.vrma',
        actionKey: 'steady_focus',
        label: 'Steady Focus',
        description: 'Softer same-her rejoin motion',
        importedAt: 2,
        source: 'builtin' as const,
      },
      {
        id: 'observe-soft',
        fileName: 'observe-soft.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Resident audible-body same-thread motion',
        importedAt: 3,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('ObserveSoft')
  })

  it('reorders body+voice-only same-her motion bindings toward softer carry even when the direct action cue appears earlier than the softer alias', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-body-voice-same-thread-motion-reorder',
      index: 0,
      startOffset: 0,
      endOffset: 10,
      text: '先沿着身体和声音这条线稳一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.24,
      facialWeight: 0.48,
      prosodyWeight: 0.42,
      beatWeight: 0.22,
      mouthWeight: 0.2,
      headWeight: 0.22,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['observe_focus', 'ObserveSoft'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'embodiment:audible_same_her_line',
        reasonTags: ['embodiment:body+voice-only'],
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus',
        fileName: 'observe-focus.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'observe-soft',
        fileName: 'observe-soft.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Resident audible-body same-thread motion',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('ObserveSoft')
  })

  it('prefers softer same-her motion bindings when same-thread quieter body+lipsync-only carry is still the surviving living line', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-quieter-body-lipsync-motion',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '先沿着这一条线轻一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.22,
      facialWeight: 0.44,
      prosodyWeight: 0.36,
      beatWeight: 0.2,
      mouthWeight: 0.18,
      headWeight: 0.2,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['observe_focus', 'ObserveSoft'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body+lipsync-only'],
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus',
        fileName: 'observe-focus.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'observe-soft',
        fileName: 'observe-soft.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Quieter same-line motion binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('ObserveSoft')
  })

  it('prefers softer same-her motion bindings when same-thread quieter body+lipsync_only carry arrives in canonical underscore form', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-quieter-body-lipsync-motion-underscore',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '先沿着这一条线轻一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.22,
      facialWeight: 0.44,
      prosodyWeight: 0.36,
      beatWeight: 0.2,
      mouthWeight: 0.18,
      headWeight: 0.2,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['observe_focus', 'ObserveSoft'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body+lipsync_only'],
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus-underscore',
        fileName: 'observe-focus-underscore.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'observe-soft-underscore',
        fileName: 'observe-soft-underscore.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Canonical quieter same-line motion binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('ObserveSoft')
  })

  it('prefers softer same-her motion bindings when same-thread lipsync+voice-only carry is still the surviving living line', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-lipsync-voice-motion',
      index: 0,
      startOffset: 0,
      endOffset: 8,
      text: '先沿着声音线轻一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.22,
      facialWeight: 0.44,
      prosodyWeight: 0.36,
      beatWeight: 0.2,
      mouthWeight: 0.18,
      headWeight: 0.2,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['observe_focus', 'ObserveSoft'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:lipsync+voice-only'],
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus-lipsync-voice',
        fileName: 'observe-focus-lipsync-voice.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'observe-soft-lipsync-voice',
        fileName: 'observe-soft-lipsync-voice.vrma',
        actionKey: 'ObserveSoft',
        label: 'Observe Soft',
        description: 'Voice-lipsync same-line motion binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('ObserveSoft')
  })

  it('prefers softer same-her motion bindings when the still-voiced face line is keeping continuity alive across same-thread continuation', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-still-voiced-face-motion',
      index: 0,
      startOffset: 0,
      endOffset: 10,
      text: '先不要把动作放大。',
      emotion: 'thinking',
      gestureWeight: 0.24,
      facialWeight: 0.46,
      prosodyWeight: 0.38,
      beatWeight: 0.22,
      mouthWeight: 0.2,
      headWeight: 0.22,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['observe_focus', 'steady_focus'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:still-voiced-face-line'],
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus',
        fileName: 'observe-focus.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'steady-focus',
        fileName: 'steady-focus.vrma',
        actionKey: 'steady_focus',
        label: 'Steady Focus',
        description: 'Still-voiced same-line motion binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('steady_focus')
  })

  it('prefers softer same-her motion bindings when the still-voiced face-and-motion line is the surviving same-thread continuity lane', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-still-voiced-face-and-motion',
      index: 0,
      startOffset: 0,
      endOffset: 12,
      text: '先沿着表情和动作还连着声音的线轻一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.24,
      facialWeight: 0.46,
      prosodyWeight: 0.38,
      beatWeight: 0.22,
      mouthWeight: 0.18,
      headWeight: 0.22,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['observe_focus', 'steady_focus'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:still-voiced-face-motion-line'],
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus-face-motion',
        fileName: 'observe-focus-face-motion.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'steady-focus-face-motion',
        fileName: 'steady-focus-face-motion.vrma',
        actionKey: 'steady_focus',
        label: 'Steady Focus',
        description: 'Still-voiced face-motion same-line motion binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('steady_focus')
  })

  it('prefers softer same-her motion bindings when the still-voiced motion line arrives through signature-only same-thread continuity', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'observe_focus'
    state.activeActionCue = 'observe_focus'
    state.activeCue = {
      id: 'segment-vrm-still-voiced-motion-signature-motion',
      index: 0,
      startOffset: 0,
      endOffset: 10,
      text: '先沿着动作和声音还连着的线轻一点回来。',
      emotion: 'thinking',
      gestureWeight: 0.24,
      facialWeight: 0.46,
      prosodyWeight: 0.38,
      beatWeight: 0.22,
      mouthWeight: 0.2,
      headWeight: 0.22,
      facialHoldMs: 340,
      actionHoldMs: 300,
      emotionHoldMs: 340,
      actionCue: 'observe_focus',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['observe_focus', 'steady_focus'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      },
    }

    const bindings = [
      {
        id: 'direct-observe-focus-signature-motion',
        fileName: 'observe-focus-signature-motion.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct action key binding',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'steady-focus-signature-motion',
        fileName: 'steady-focus-signature-motion.vrma',
        actionKey: 'steady_focus',
        label: 'Steady Focus',
        description: 'Signature-only still-voiced same-line motion binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('steady_focus')
  })

  it('falls back from canonical idle_settle semantics to the builtin settle_idle binding when no direct idle_settle action binding exists', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.actionCue = 'idle_settle'
    state.activeActionCue = 'idle_settle'
    state.activeCue = {
      id: 'segment-vrm-idle-settle-builtin-fallback',
      index: 0,
      startOffset: 0,
      endOffset: 6,
      text: '先稳住一点。',
      emotion: 'thinking',
      gestureWeight: 0.18,
      facialWeight: 0.34,
      prosodyWeight: 0.22,
      beatWeight: 0.16,
      mouthWeight: 0.18,
      headWeight: 0.16,
      facialHoldMs: 320,
      actionHoldMs: 280,
      emotionHoldMs: 320,
      actionCue: 'idle_settle',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredMotionAliases: ['IdleSettle'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
    }

    const bindings = [
      {
        id: 'builtin-settle-idle',
        fileName: 'settle-idle.vrma',
        actionKey: 'settle_idle',
        label: 'Settle Idle',
        description: 'Builtin idle settle loop for restrained return beats',
        importedAt: 1,
        source: 'builtin' as const,
      },
    ]

    expect(resolveVrmPreferredActionBinding(state, bindings)?.actionKey).toBe('settle_idle')
  })

  it('changes the expression watch key when restrained recovery alias, gaze, and blink cadence change together even if the facial cue stays the same', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'thinking'
    state.performance.facialCue = 'soft-gaze'
    state.activeFacialCue = 'soft-gaze'
    state.expressionIntensity = 0.74
    state.facialCueIntensity = 0.62
    state.motor.expressivity = 0.34
    state.motor.facial.cheekLift = 0.08
    state.motor.facial.browTension = 0.28
    state.motor.facial.eyeOpenness = 0.48
    state.motor.stillness = 0.72
    state.activeSegment = {
      intentId: 'intent-vrm-restrained-recovery-watch',
      streamId: 'stream-vrm-restrained-recovery-watch',
      segmentId: 'segment-vrm-restrained-recovery-watch',
      ownerId: 'alice',
      text: '先收回来一点。',
      special: null,
      continuityHoldMs: 340,
      playbackDurationMs: 220,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    state.activeCue = {
      id: 'segment-vrm-restrained-recovery-watch',
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
      actionCue: 'idle_settle',
      facialCue: 'soft-gaze',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
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

    const initialKey = resolveVrmDialogueExpressionWatchKey(state)

    state.activeCue = {
      ...state.activeCue,
      rendererHints: {
        residentMode: 'measured-return',
        preferredExpressionAliases: ['CalmInspect'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'steady',
      },
    }

    const updatedKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(updatedKey).not.toBe(initialKey)
    expect(initialKey).toContain('repair-before-closeness')
    expect(initialKey).toContain('RecoverSoft')
    expect(initialKey).toContain('quiet')
    expect(initialKey).toContain('soften')
    expect(updatedKey).toContain('measured-return')
    expect(updatedKey).toContain('CalmInspect')
    expect(updatedKey).toContain('linger')
    expect(updatedKey).toContain('steady')
  })
})
