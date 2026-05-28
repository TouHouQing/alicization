import {
  createIdleStageEmbodimentPerformanceState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  resolveVrmPreferredActionBinding,
  resolveVrmPreferredCustomExpressionBinding,
  resolveVrmDialogueExpressionWatchKey,
  resolveVrmDialoguePerformanceFromState,
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
})
