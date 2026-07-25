import { createIdleStageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { resolveLive2DExpressionSelection } from '../../../../stage-ui-live2d/src/composables/live2d/expression-runtime'
import {
  resolveVrmPreferredActionBinding,
  resolveVrmPreferredCustomExpressionBinding,
} from '../../../../stage-ui-three/src/composables/vrm/performance-selection'
import { useLive2d } from '../../stores/live2d'
import { useStagePerformanceStore } from '../../stores/stage-performance'
import {
  applyRuntimeEmbodimentActiveCueState,
  applyRuntimeEmbodimentEnvelopeCueState,
  clearRuntimeSegmentEmbodimentCueState,
  createEmptyStageRuntimeEmbodimentCueState,
  resolveActiveCueWatchKey,
  resolveLive2DSegmentMotionCueSelection,
  resolvePreferredExpressionAliasesFromRuntimeState,
  resolvePreferredMotionAliasesFromRuntimeState,
  resolvePreferredVrmExpressionAliasesFromRuntimeState,
  resolveRendererSettleMsWithPersonaBias,
} from './stage-runtime-embodiment-cues'

describe('stage runtime embodiment cues', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('merges turn-level and segment-level live2d expression aliases with configured defaults', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['TurnFocus'],
        preferredMotionAliases: ['TurnObserve'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['SegmentFocus'],
        preferredMotionAliases: ['SegmentObserve'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(resolvePreferredExpressionAliasesFromRuntimeState(state, 'thinking', ['ConfiguredFocus'])).toEqual([
      'SegmentFocus',
      'TurnFocus',
      'ConfiguredFocus',
    ])
    expect(resolvePreferredMotionAliasesFromRuntimeState(state, 'thinking', ['ConfiguredObserve'])).toEqual([
      'SegmentObserve',
      'TurnObserve',
      'ConfiguredObserve',
    ])
  })

  it('returns the cue follow-through window while storing segment motion aliases', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    const result = applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'happy',
      rendererHints: {
        preferredMotionAliases: ['CheerSwing'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 360,
      },
    })

    expect(result.followThroughMs).toBe(360)
    expect(state.segmentMotionAliasesByEmotion).toEqual({
      happy: ['CheerSwing'],
    })
  })

  it('does not infer follow-through timing from alias names', () => {
    const firstState = createEmptyStageRuntimeEmbodimentCueState()
    const secondState = createEmptyStageRuntimeEmbodimentCueState()

    const firstResult = applyRuntimeEmbodimentActiveCueState(firstState, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['segment_expression', 'gentle-expression'],
        preferredMotionAliases: ['inspect_scene', 'segment_motion'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    const secondResult = applyRuntimeEmbodimentActiveCueState(secondState, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['turn-expression', 'gentle-expression'],
        preferredMotionAliases: ['segment_motion', 'inspect_scene'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(firstResult.followThroughMs).toBe(420)
    expect(secondResult.followThroughMs).toBe(420)
  })

  it('still extends follow-through from companionship micro-state even when active cue aliases are absent', () => {
    const measuredReturnState = createEmptyStageRuntimeEmbodimentCueState()
    const repairState = createEmptyStageRuntimeEmbodimentCueState()

    const measuredReturnResult = applyRuntimeEmbodimentActiveCueState(measuredReturnState, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    const repairResult = applyRuntimeEmbodimentActiveCueState(repairState, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(measuredReturnResult.followThroughMs).toBeGreaterThan(420)
    expect(repairResult.followThroughMs).toBeGreaterThan(measuredReturnResult.followThroughMs)
  })

  it('does not let renderer audit text alter repair-before-closeness settle', () => {
    const repairState = createEmptyStageRuntimeEmbodimentCueState()
    const auditedRepairState = createEmptyStageRuntimeEmbodimentCueState()

    const ordinaryRepairResult = applyRuntimeEmbodimentActiveCueState(repairState, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    const auditedRepairResult = applyRuntimeEmbodimentActiveCueState(auditedRepairState, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        signature: 'audit:untrusted',
        reasonTags: ['audit:untrusted'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(auditedRepairResult.followThroughMs).toBe(ordinaryRepairResult.followThroughMs)
  })

  it('extends measured-return settle when the audible living line is already formed but face has not yet rejoined', () => {
    expect(resolveRendererSettleMsWithPersonaBias({
      baseMs: 420,
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      rendererHints: {
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
      },
    })).toBe(620)
  })

  it('resolves live2d segment motion aliases from merged segment, turn, and configured sources', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['TurnObserve'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['SegmentObserve'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(resolveLive2DSegmentMotionCueSelection({
      state,
      cue: {
        emotion: 'thinking',
        rendererHints: {
          preferredMotionAliases: ['SegmentObserve'],
        },
        rendererSettle: {
          live2dMotionFollowThroughMs: 420,
        },
      },
      configuredAliases: ['ConfiguredObserve'],
    })).toEqual({
      emotion: 'thinking',
      followThroughMs: 420,
      preferredMotionAliases: ['SegmentObserve', 'TurnObserve', 'ConfiguredObserve'],
    })
  })

  it('applies structured companionship settle bias during live2d motion cue resolution', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['segment_expression', 'gentle-expression'],
        preferredMotionAliases: ['inspect_scene', 'segment_motion'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['segment_expression', 'gentle-expression'],
        preferredMotionAliases: ['inspect_scene', 'segment_motion'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(resolveLive2DSegmentMotionCueSelection({
      state,
      cue: {
        emotion: 'thinking',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['segment_expression', 'gentle-expression'],
          preferredMotionAliases: ['inspect_scene', 'segment_motion'],
        },
        rendererSettle: {
          live2dMotionFollowThroughMs: 420,
        },
      },
      configuredAliases: ['ConfiguredObserve'],
    })).toEqual({
      emotion: 'thinking',
      followThroughMs: 600,
      preferredMotionAliases: ['inspect_scene', 'segment_motion', 'ConfiguredObserve'],
    })
  })

  it('preserves explicit motion alias order during measured-return live2d motion resolution', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['TurnMotion'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'measured-return',
        preferredMotionAliases: ['inspect_scene', 'secondary_motion', 'TurnMotion'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(resolveLive2DSegmentMotionCueSelection({
      state,
      cue: {
        emotion: 'thinking',
        rendererHints: {
          residentMode: 'measured-return',
          preferredMotionAliases: ['inspect_scene', 'secondary_motion', 'TurnMotion'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dMotionFollowThroughMs: 420,
        },
      },
      configuredAliases: ['ConfiguredIdle'],
    })).toEqual({
      emotion: 'thinking',
      followThroughMs: 540,
      preferredMotionAliases: ['inspect_scene', 'secondary_motion', 'TurnMotion', 'ConfiguredIdle'],
    })
  })

  it('does not reorder motion aliases from audit text during same-thread live2d motion resolution', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['TurnMotion'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['inspect_scene', 'secondary_motion', 'TurnMotion'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'audit:untrusted',
        reasonTags: ['audit:untrusted'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(resolveLive2DSegmentMotionCueSelection({
      state,
      cue: {
        emotion: 'thinking',
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredMotionAliases: ['inspect_scene', 'secondary_motion', 'TurnMotion'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'audit:untrusted',
          reasonTags: ['audit:untrusted'],
        },
        rendererSettle: {
          live2dMotionFollowThroughMs: 420,
        },
      },
      configuredAliases: ['ConfiguredIdle'],
    })).toEqual({
      emotion: 'thinking',
      followThroughMs: 420,
      preferredMotionAliases: ['inspect_scene', 'secondary_motion', 'TurnMotion', 'ConfiguredIdle'],
    })
  })

  it('drives live2d motion selection from the merged script-only runtime aliases', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    const live2d = useLive2d()
    const stagePerformance = useStagePerformanceStore()

    live2d.setAvailableMotionsForModel('live2d-model', [
      {
        motionName: 'ConfiguredObserve',
        motionIndex: 1,
        fileName: 'configured-observe.motion3.json',
      },
      {
        motionName: 'Idle',
        motionIndex: 0,
        fileName: 'idle.motion3.json',
      },
    ])
    stagePerformance.setLive2DEmotionMotionAliases('live2d-model', 'thinking', ['ConfiguredObserve'])

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['TurnObserve'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['SegmentObserve'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    const preferredMotionAliases = resolvePreferredMotionAliasesFromRuntimeState(
      state,
      'thinking',
      stagePerformance.resolveLive2DEmotionMotionAliases('live2d-model', 'thinking'),
    )

    expect(preferredMotionAliases.slice(0, 3)).toEqual([
      'SegmentObserve',
      'TurnObserve',
      'ConfiguredObserve',
    ])
    expect(preferredMotionAliases).toEqual(expect.arrayContaining([
      'Observe',
    ]))
    expect(live2d.resolveEmotionMotionSelection('live2d-model', 'thinking', {
      preferredMotionAliases,
    })).toEqual({
      group: 'ConfiguredObserve',
      index: 1,
    })
  })

  it('drives live2d expression selection from the merged script-only runtime aliases', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    const stagePerformance = useStagePerformanceStore()

    stagePerformance.setLive2DEmotionExpressionAliases('live2d-model', 'thinking', ['ConfiguredFocus'])

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['TurnFocus'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['SegmentFocus'],
      },
    })

    const preferredExpressionAliases = resolvePreferredExpressionAliasesFromRuntimeState(
      state,
      'thinking',
      stagePerformance.resolveLive2DEmotionExpressionAliases('live2d-model', 'thinking'),
    )

    expect(preferredExpressionAliases.slice(0, 3)).toEqual([
      'SegmentFocus',
      'TurnFocus',
      'ConfiguredFocus',
    ])
    expect(resolveLive2DExpressionSelection({
      delivery: 'calm',
      emotion: 'thinking',
      expressionIntensity: 0.82,
      expressionNames: [
        'neutral_exp_05',
        'configured_focus_exp',
        'happy_exp_01',
      ],
      facialCue: 'focus',
      facialCueIntensity: 0.88,
      preferredExpressionAliases,
    })).toEqual(expect.objectContaining({
      name: 'configured_focus_exp',
      reason: 'preferred',
    }))
  })

  it('keeps runtime expression aliases ahead of configured aliases for actual live2d selection', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    const stagePerformance = useStagePerformanceStore()

    stagePerformance.setLive2DEmotionExpressionAliases('live2d-model', 'thinking', ['ConfiguredFocus'])

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['TurnExpression'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['SegmentExpression'],
      },
    })

    const preferredExpressionAliases = resolvePreferredExpressionAliasesFromRuntimeState(
      state,
      'thinking',
      stagePerformance.resolveLive2DEmotionExpressionAliases('live2d-model', 'thinking'),
    )

    expect(preferredExpressionAliases.slice(0, 3)).toEqual([
      'SegmentExpression',
      'TurnExpression',
      'ConfiguredFocus',
    ])
    expect(resolveLive2DExpressionSelection({
      delivery: 'gentle',
      emotion: 'thinking',
      expressionIntensity: 0.72,
      expressionNames: [
        'configured_focus_exp',
        'segment_expression_exp',
        'neutral_exp_05',
      ],
      facialCue: 'gentle-expression',
      facialCueIntensity: 0.74,
      preferredExpressionAliases,
    })).toEqual(expect.objectContaining({
      name: 'segment_expression_exp',
      reason: 'preferred',
    }))
  })

  it('drives vrm custom expression binding selection from the merged script-only runtime aliases', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    const stagePerformance = useStagePerformanceStore()

    stagePerformance.setVrmEmotionExpressionAliases('vrm-model', 'thinking', ['ConfiguredFocus'])

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['TurnFocus'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['SegmentFocus'],
      },
    })

    const preferredExpressionAliases = resolvePreferredVrmExpressionAliasesFromRuntimeState(
      state,
      'thinking',
      stagePerformance.resolveVrmEmotionExpressionAliases('vrm-model', 'thinking'),
    )

    expect(preferredExpressionAliases.slice(0, 3)).toEqual([
      'SegmentFocus',
      'TurnFocus',
      'ConfiguredFocus',
    ])

    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.activeFacialCue = 'focused'
    performanceState.activeCue = {
      id: 'segment-vrm-script-only',
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
      actionCue: 'inspect_scene',
      facialCue: 'focused',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredExpressionAliases,
      },
    }

    expect(resolveVrmPreferredCustomExpressionBinding(performanceState, [
      {
        expressionName: 'ConfiguredFocus',
        facialKey: 'configured_focus',
        label: 'Configured Focus',
        description: 'Model configured focus expression',
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
    ])?.expressionName).toBe('ConfiguredFocus')
  })

  it('drives vrm action binding selection from the merged script-only runtime aliases', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['TurnObserve'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['SegmentObserve'],
      },
    })

    const preferredMotionAliases = resolvePreferredMotionAliasesFromRuntimeState(
      state,
      'thinking',
      ['ConfiguredObserve'],
    )

    expect(preferredMotionAliases.slice(0, 3)).toEqual([
      'SegmentObserve',
      'TurnObserve',
      'ConfiguredObserve',
    ])

    const performanceState = createIdleStageEmbodimentPerformanceState()
    performanceState.phase = 'speaking'
    performanceState.activeActionCue = 'inspect_scene'
    performanceState.actionPulse.cue = 'inspect_scene'
    performanceState.activeCue = {
      id: 'segment-vrm-script-action',
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
      actionCue: 'inspect_scene',
      facialCue: 'focused',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      rendererHints: {
        preferredMotionAliases,
      },
    }

    expect(resolveVrmPreferredActionBinding(performanceState, [
      {
        id: 'configured-observe',
        fileName: 'configured-observe.vrma',
        actionKey: 'ConfiguredObserve',
        label: 'Configured Observe',
        description: 'Model configured observe action',
        importedAt: 1,
        source: 'builtin' as const,
      },
      {
        id: 'inspect-scene',
        fileName: 'inspect-scene.vrma',
        actionKey: 'inspect_scene',
        label: 'Inspect Scene',
        description: 'Direct cue binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ])?.actionKey).toBe('ConfiguredObserve')
  })

  it('keeps explicit runtime motion aliases ahead of configured aliases', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['secondary_motion', 'TurnMotion'],
      },
    } as any)

    const preferredMotionAliases = resolvePreferredMotionAliasesFromRuntimeState(
      state,
      'thinking',
      ['inspect_scene', 'secondary_motion', 'ConfiguredObserve'],
    )

    expect(preferredMotionAliases.slice(0, 4)).toEqual([
      'secondary_motion',
      'TurnMotion',
      'inspect_scene',
      'ConfiguredObserve',
    ])
  })

  it('keeps structured runtime aliases ahead of generic configured aliases across live2d and vrm selection', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    const stagePerformance = useStagePerformanceStore()

    stagePerformance.setLive2DEmotionExpressionAliases('live2d-model', 'thinking', ['ConfiguredFocus'])

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['segment_expression', 'gentle-expression'],
        preferredMotionAliases: ['inspect_scene', 'segment_motion'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['segment_expression', 'gentle-expression'],
        preferredMotionAliases: ['inspect_scene', 'segment_motion'],
      },
    })

    const preferredExpressionAliases = resolvePreferredExpressionAliasesFromRuntimeState(
      state,
      'thinking',
      stagePerformance.resolveLive2DEmotionExpressionAliases('live2d-model', 'thinking'),
    )
    const preferredMotionAliases = resolvePreferredMotionAliasesFromRuntimeState(
      state,
      'thinking',
      ['ConfiguredObserve'],
    )
    const preferredVrmExpressionAliases = resolvePreferredVrmExpressionAliasesFromRuntimeState(
      state,
      'thinking',
      ['ConfiguredFocus'],
    )

    expect(preferredExpressionAliases.slice(0, 3)).toEqual([
      'segment_expression',
      'gentle-expression',
      'ConfiguredFocus',
    ])
    expect(preferredMotionAliases.slice(0, 3)).toEqual([
      'inspect_scene',
      'segment_motion',
      'ConfiguredObserve',
    ])
    expect(preferredVrmExpressionAliases.slice(0, 3)).toEqual([
      'segment_expression',
      'gentle-expression',
      'ConfiguredFocus',
    ])
  })

  it('changes the active cue watch key when companionship micro-state changes even if id, aliases, and settle stay the same', () => {
    const measuredReturnKey = resolveActiveCueWatchKey({
      id: 'segment-structured-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'measured-return',
        preferredExpressionAliases: ['TurnExpression'],
        preferredMotionAliases: ['SegmentMotion'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })

    const repairKey = resolveActiveCueWatchKey({
      id: 'segment-structured-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['TurnExpression'],
        preferredMotionAliases: ['SegmentMotion'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })

    expect(repairKey).not.toBe(measuredReturnKey)
    expect(measuredReturnKey).toContain('measured-return')
    expect(repairKey).toContain('repair-before-closeness')
    expect(repairKey).toContain('quiet')
  })

  it('keeps the active cue watch key stable when only renderer audit text changes', () => {
    const ordinaryRepairKey = resolveActiveCueWatchKey({
      id: 'segment-repair-body-voice-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['TurnExpression'],
        preferredMotionAliases: ['SegmentMotion'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })

    const auditedRepairKey = resolveActiveCueWatchKey({
      id: 'segment-repair-body-voice-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['TurnExpression'],
        preferredMotionAliases: ['SegmentMotion'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        signature: 'audit:untrusted',
        reasonTags: ['audit:untrusted'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })

    expect(auditedRepairKey).toBe(ordinaryRepairKey)
    expect(auditedRepairKey).not.toContain('audit:untrusted')
  })

  it('changes the active cue watch key when structured speech pacing micro-state changes even if aliases and settle stay the same', () => {
    const slowerLowerPressureKey = resolveActiveCueWatchKey({
      id: 'segment-structured-speech-pacing-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'measured-return',
        preferredExpressionAliases: ['TurnExpression'],
        preferredMotionAliases: ['SegmentMotion'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })

    const naturalEvenKey = resolveActiveCueWatchKey({
      id: 'segment-structured-speech-pacing-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'measured-return',
        preferredExpressionAliases: ['TurnExpression'],
        preferredMotionAliases: ['SegmentMotion'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'natural',
        preferredLipsyncMode: 'matched',
        preferredVoiceMode: 'even',
        preferredPacingMode: 'natural',
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })

    expect(slowerLowerPressureKey).not.toBe(naturalEvenKey)
    expect(slowerLowerPressureKey).toContain('longer')
    expect(slowerLowerPressureKey).toContain('restrained')
    expect(slowerLowerPressureKey).toContain('lower-pressure')
    expect(slowerLowerPressureKey).toContain('slower')
  })

  it('extends measured-return settle further when slower lower-pressure restrained speech timing is explicit on the structured cue', () => {
    const ordinaryMeasuredReturnSettle = resolveRendererSettleMsWithPersonaBias({
      baseMs: 420,
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      rendererHints: {
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'natural',
        preferredLipsyncMode: 'matched',
        preferredVoiceMode: 'even',
        preferredPacingMode: 'natural',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
      },
    })

    const slowerLowerPressureSettle = resolveRendererSettleMsWithPersonaBias({
      baseMs: 420,
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      rendererHints: {
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
      },
    })

    expect(slowerLowerPressureSettle).toBeGreaterThan(ordinaryMeasuredReturnSettle)
  })

  it('clears segment aliases when the active cue emotion disappears', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['SegmentFocus'],
        preferredMotionAliases: ['SegmentObserve'],
      },
    })

    clearRuntimeSegmentEmbodimentCueState(state)

    expect(state.segmentExpressionAliasesByEmotion).toEqual({})
    expect(state.segmentMotionAliasesByEmotion).toEqual({})
  })
})
