import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  applyRuntimeEmbodimentActiveCueState,
  applyRuntimeEmbodimentEnvelopeCueState,
  clearRuntimeSegmentEmbodimentCueState,
  createEmptyStageRuntimeEmbodimentCueState,
  resolveLive2DSegmentMotionCueSelection,
  resolvePreferredExpressionAliasesFromRuntimeState,
  resolvePreferredMotionAliasesFromRuntimeState,
  resolvePreferredVrmExpressionAliasesFromRuntimeState,
} from './stage-runtime-embodiment-cues'
import { useLive2d } from '../../stores/live2d'
import { useStagePerformanceStore } from '../../stores/stage-performance'
import { resolveLive2DExpressionSelection } from '../../../../stage-ui-live2d/src/composables/live2d/expression-runtime'
import {
  resolveVrmPreferredActionBinding,
  resolveVrmPreferredCustomExpressionBinding,
} from '../../../../stage-ui-three/src/composables/vrm/performance-selection'
import { createIdleStageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'

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
      actionCue: 'observe_focus',
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
    performanceState.activeActionCue = 'observe_focus'
    performanceState.actionPulse.cue = 'observe_focus'
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
      actionCue: 'observe_focus',
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
        id: 'observe-focus',
        fileName: 'observe-focus.vrma',
        actionKey: 'observe_focus',
        label: 'Observe Focus',
        description: 'Direct cue binding',
        importedAt: 2,
        source: 'builtin' as const,
      },
    ])?.actionKey).toBe('ConfiguredObserve')
  })

  it('keeps quiet-accompaniment resident motion aliases biased toward steady focus before generic observe aliases', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['steady_focus', 'ObserveSoft'],
      },
    } as any)

    const preferredMotionAliases = resolvePreferredMotionAliasesFromRuntimeState(
      state,
      'thinking',
      ['observe_focus', 'steady_focus', 'ConfiguredObserve'],
    )

    expect(preferredMotionAliases.slice(0, 4)).toEqual([
      'steady_focus',
      'ObserveSoft',
      'observe_focus',
      'ConfiguredObserve',
    ])
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
