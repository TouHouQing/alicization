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

  it('extends follow-through for measured-return and repair-before-closeness persona aliases so motion settles more gently', () => {
    const measuredReturnState = createEmptyStageRuntimeEmbodimentCueState()
    const repairState = createEmptyStageRuntimeEmbodimentCueState()

    const measuredReturnResult = applyRuntimeEmbodimentActiveCueState(measuredReturnState, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
        preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    const repairResult = applyRuntimeEmbodimentActiveCueState(repairState, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['recover-soft', 'soft-gaze'],
        preferredMotionAliases: ['stillness_guard', 'observe_focus'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(measuredReturnResult.followThroughMs).toBe(600)
    expect(repairResult.followThroughMs).toBe(600)
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

  it('extends repair-before-closeness settle further when same-her body+voice-only continuity is explicit even if active cue aliases are still absent', () => {
    const repairState = createEmptyStageRuntimeEmbodimentCueState()
    const sameHerRepairState = createEmptyStageRuntimeEmbodimentCueState()

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

    const sameHerRepairResult = applyRuntimeEmbodimentActiveCueState(sameHerRepairState, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
      },
    })

    expect(sameHerRepairResult.followThroughMs).toBeGreaterThan(ordinaryRepairResult.followThroughMs)
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
      preferredExpressionAliases: [],
      preferredMotionAliases: [],
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

  it('applies companionship settle bias during live2d motion cue resolution, not only alias ordering', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
        preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
        preferredMotionAliases: ['observe_focus', 'stillness_guard'],
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
          preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
          preferredMotionAliases: ['observe_focus', 'stillness_guard'],
        },
        rendererSettle: {
          live2dMotionFollowThroughMs: 420,
        },
      },
      configuredAliases: ['ConfiguredObserve'],
    })).toEqual({
      emotion: 'thinking',
      followThroughMs: 600,
      preferredMotionAliases: ['observe_focus', 'stillness_guard', 'ConfiguredObserve'],
    })
  })

  it('prefers softer same-her rejoin motion aliases during measured-return live2d motion resolution', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['ObserveSoft'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'measured-return',
        preferredMotionAliases: ['observe_focus', 'steady_focus', 'ObserveSoft'],
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
          preferredMotionAliases: ['observe_focus', 'steady_focus', 'ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        rendererSettle: {
          live2dMotionFollowThroughMs: 420,
        },
      },
      configuredAliases: ['IdleSettle'],
    })).toEqual({
      emotion: 'thinking',
      followThroughMs: 540,
      preferredMotionAliases: ['steady_focus', 'ObserveSoft', 'IdleSettle', 'observe_focus'],
    })
  })

  it('prefers softer same-her rejoin motion aliases during same-thread body+voice-only live2d motion resolution', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredMotionAliases: ['ObserveSoft'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredMotionAliases: ['observe_focus', 'steady_focus', 'ObserveSoft'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
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
          preferredMotionAliases: ['observe_focus', 'steady_focus', 'ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
          reasonTags: ['embodiment:body+voice-only'],
        },
        rendererSettle: {
          live2dMotionFollowThroughMs: 420,
        },
      },
      configuredAliases: ['IdleSettle'],
    })).toEqual({
      emotion: 'thinking',
      followThroughMs: 420,
      preferredMotionAliases: ['steady_focus', 'ObserveSoft', 'IdleSettle', 'observe_focus'],
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

  it('keeps companionship-specific expression aliases ahead of generic configured aliases for actual live2d expression selection', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    const stagePerformance = useStagePerformanceStore()

    stagePerformance.setLive2DEmotionExpressionAliases('live2d-model', 'thinking', ['ConfiguredFocus'])

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['RecoverSoft'],
      },
    })

    const preferredExpressionAliases = resolvePreferredExpressionAliasesFromRuntimeState(
      state,
      'thinking',
      stagePerformance.resolveLive2DEmotionExpressionAliases('live2d-model', 'thinking'),
    )

    expect(preferredExpressionAliases.slice(0, 3)).toEqual([
      'RecoverSoft',
      'CalmInspect',
      'ConfiguredFocus',
    ])
    expect(resolveLive2DExpressionSelection({
      delivery: 'gentle',
      emotion: 'thinking',
      expressionIntensity: 0.72,
      expressionNames: [
        'configured_focus_exp',
        'recover_soft_exp',
        'neutral_exp_05',
      ],
      facialCue: 'soft-gaze',
      facialCueIntensity: 0.74,
      preferredExpressionAliases,
    })).toEqual(expect.objectContaining({
      name: 'recover_soft_exp',
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

  it('keeps main-generated measured-return aliases ahead of generic configured aliases across live2d and vrm selection', () => {
    const state = createEmptyStageRuntimeEmbodimentCueState()
    const stagePerformance = useStagePerformanceStore()

    stagePerformance.setLive2DEmotionExpressionAliases('live2d-model', 'thinking', ['ConfiguredFocus'])

    applyRuntimeEmbodimentEnvelopeCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
        preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      },
    } as any)
    applyRuntimeEmbodimentActiveCueState(state, {
      emotion: 'thinking',
      rendererHints: {
        preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
        preferredMotionAliases: ['observe_focus', 'stillness_guard'],
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
      'calm_inspect',
      'soft-gaze',
      'ConfiguredFocus',
    ])
    expect(preferredMotionAliases.slice(0, 3)).toEqual([
      'observe_focus',
      'stillness_guard',
      'ConfiguredObserve',
    ])
    expect(preferredVrmExpressionAliases.slice(0, 3)).toEqual([
      'calm_inspect',
      'soft-gaze',
      'ConfiguredFocus',
    ])
  })

  it('changes the active cue watch key when companionship micro-state changes even if id, aliases, and settle stay the same', () => {
    const measuredReturnKey = resolveActiveCueWatchKey({
      id: 'segment-same-her-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'measured-return',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
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
      id: 'segment-same-her-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
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

  it('changes the active cue watch key when repair-before-closeness body+voice-only identity-continuity', () => {
    const ordinaryRepairKey = resolveActiveCueWatchKey({
      id: 'segment-repair-body-voice-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })

    const sameHerRepairKey = resolveActiveCueWatchKey({
      id: 'segment-repair-body-voice-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      },
      rendererSettle: {
        live2dMotionFollowThroughMs: 420,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })

    expect(sameHerRepairKey).not.toBe(ordinaryRepairKey)
    expect(sameHerRepairKey).toContain('embodiment:audible_same_her_line')
    expect(sameHerRepairKey).toContain('embodiment:body+voice-only')
  })

  it('changes the active cue watch key when same-her speech pacing micro-state changes even if aliases and settle stay the same', () => {
    const slowerLowerPressureKey = resolveActiveCueWatchKey({
      id: 'segment-same-her-speech-pacing-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'measured-return',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
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
      id: 'segment-same-her-speech-pacing-watch-key',
      emotion: 'thinking',
      rendererHints: {
        residentMode: 'measured-return',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
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

  it('extends measured-return settle further when slower lower-pressure restrained speech timing is explicit on the continuity state', () => {
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
      preferredExpressionAliases: [],
      preferredMotionAliases: [],
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
      preferredExpressionAliases: [],
      preferredMotionAliases: [],
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
