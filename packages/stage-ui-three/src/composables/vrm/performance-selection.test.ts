import type { StageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'

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

function createActiveCue(input: {
  id?: string
  preferredExpressionAliases?: string[]
  preferredMotionAliases?: string[]
  rendererSettleMs?: number
  rendererHints?: Record<string, unknown>
} = {}): NonNullable<StageEmbodimentPerformanceState['activeCue']> {
  return {
    id: input.id ?? 'segment-current',
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
      preferredExpressionAliases: input.preferredExpressionAliases,
      preferredMotionAliases: input.preferredMotionAliases,
      ...input.rendererHints,
    },
    rendererSettle: {
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 420,
      vrmActionFadeMs: 280,
      vrmExpressionBlendMs: input.rendererSettleMs ?? 360,
    },
  } as NonNullable<StageEmbodimentPerformanceState['activeCue']>
}

function createExpressionBinding(expressionName: string, facialKey: string = expressionName) {
  return {
    expressionName,
    facialKey,
    label: expressionName,
    description: `${expressionName} binding`,
    affectsMouth: false,
    source: 'custom' as const,
  }
}

function createActionBinding(actionKey: string, importedAt: number = 1) {
  return {
    id: actionKey,
    fileName: `${actionKey}.vrma`,
    actionKey,
    label: actionKey,
    description: `${actionKey} binding`,
    importedAt,
    source: 'builtin' as const,
  }
}

describe('vrm performance selection', () => {
  it('prefers active segment-authored cues over base performance cues', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.baseEmotion = 'happy'
    state.performance.emphasis = 2
    state.performance.facialCue = 'resident_smile'
    state.performance.actionCue = 'resident_nod'
    state.activeFacialCue = 'segment_focus'
    state.activeActionCue = 'segment_bow'

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

  it('changes the expression watch key when the active facial cue changes', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.performance.facialCue = 'resident_smile'
    state.activeFacialCue = 'segment_focus'

    const initialKey = resolveVrmDialogueExpressionWatchKey(state)
    state.activeFacialCue = 'segment_reassure'
    const updatedKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(updatedKey).not.toBe(initialKey)
    expect(updatedKey).toContain('segment_reassure')
    expect(updatedKey).not.toContain('resident_smile')
  })

  it('prefers active segment authority over stale cue-shell identifiers in the watch key', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeSegment = {
      intentId: 'intent-current',
      streamId: 'stream-current',
      segmentId: 'segment-current',
      ownerId: 'alice',
      text: '继续看',
      special: null,
      continuityHoldMs: 320,
      playbackDurationMs: 220,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    }
    state.activeCue = createActiveCue({ id: 'turn-stale:0' })

    const watchKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(watchKey).toContain('segment-current')
    expect(watchKey).not.toContain('turn-stale:0')
  })

  it('uses the active digital-life frame id before stale performance identifiers', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeSegment = {
      intentId: 'intent-current',
      streamId: 'stream-current',
      segmentId: 'segment-shell',
      ownerId: 'alice',
      text: '继续看',
      special: null,
      continuityHoldMs: 320,
      playbackDurationMs: 220,
      metadata: null,
      cue: null,
      digitalLifeFrame: {
        id: 'segment-frame-current',
      } as NonNullable<StageEmbodimentPerformanceState['activeSegment']>['digitalLifeFrame'],
    }
    state.activeCue = createActiveCue({ id: 'turn-stale:0' })

    const watchKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(watchKey).toContain('segment-frame-current')
    expect(watchKey).not.toContain('segment-shell')
  })

  it('changes the expression watch key for explicit alias or blend timing changes', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeCue = createActiveCue({
      preferredExpressionAliases: ['ExpressionA'],
      rendererSettleMs: 320,
    })

    const initialKey = resolveVrmDialogueExpressionWatchKey(state)
    state.activeCue = createActiveCue({
      preferredExpressionAliases: ['ExpressionB'],
      rendererSettleMs: 420,
    })
    const updatedKey = resolveVrmDialogueExpressionWatchKey(state)

    expect(updatedKey).not.toBe(initialKey)
    expect(initialKey).toContain('ExpressionA')
    expect(initialKey).toContain('320')
    expect(updatedKey).toContain('ExpressionB')
    expect(updatedKey).toContain('420')
  })

  it('does not let audit metadata change the expression watch key', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeCue = createActiveCue({
      preferredExpressionAliases: ['ExpressionA'],
      rendererHints: {
        residentMode: 'measured-return',
        reasonTags: ['audit-a'],
        signature: 'audit:a',
      },
    })

    const initialKey = resolveVrmDialogueExpressionWatchKey(state)
    state.activeCue = createActiveCue({
      preferredExpressionAliases: ['ExpressionA'],
      rendererHints: {
        residentMode: 'repair-before-closeness',
        reasonTags: ['audit-b'],
        signature: 'audit:b',
      },
    })

    expect(resolveVrmDialogueExpressionWatchKey(state)).toBe(initialKey)
  })

  it('prefers explicit expression aliases over direct facial cues', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeFacialCue = 'DirectExpression'
    state.activeCue = createActiveCue({
      preferredExpressionAliases: ['ConfiguredExpression'],
    })

    expect(resolveVrmPreferredCustomExpressionBinding(state, [
      createExpressionBinding('ConfiguredExpression'),
      createExpressionBinding('DirectExpression'),
    ])?.expressionName).toBe('ConfiguredExpression')
  })

  it('prefers explicit motion aliases over direct action cues', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeActionCue = 'direct_action'
    state.activeCue = createActiveCue({
      preferredMotionAliases: ['configured_action'],
    })

    expect(resolveVrmPreferredActionBinding(state, [
      createActionBinding('direct_action'),
      createActionBinding('configured_action', 2),
    ])?.actionKey).toBe('configured_action')
  })

  it('preserves explicit expression and motion alias order regardless of audit metadata', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeCue = createActiveCue({
      preferredExpressionAliases: ['ExpressionFirst', 'ExpressionSecond'],
      preferredMotionAliases: ['motion_first', 'motion_second'],
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonTags: ['audit-only'],
        signature: 'audit:opaque',
      },
    })

    expect(resolveVrmPreferredCustomExpressionBinding(state, [
      createExpressionBinding('ExpressionFirst'),
      createExpressionBinding('ExpressionSecond'),
    ])?.expressionName).toBe('ExpressionFirst')
    expect(resolveVrmPreferredActionBinding(state, [
      createActionBinding('motion_first'),
      createActionBinding('motion_second', 2),
    ])?.actionKey).toBe('motion_first')
  })

  it('falls back from idle_settle to a settle_idle binding with equivalent semantics', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.phase = 'speaking'
    state.activeCue = createActiveCue({
      preferredMotionAliases: ['idle_settle'],
    })

    expect(resolveVrmPreferredActionBinding(state, [
      createActionBinding('settle_idle'),
    ])?.actionKey).toBe('settle_idle')
  })
})
