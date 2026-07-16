import { createIdleStageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  buildLive2DActionPulseReplayKey,
  resolveLive2DActionPulseBinding,
} from './action-pulse'

describe('live2d action pulse binding resolver', () => {
  it('matches a semantic action cue to its motion binding', () => {
    expect(resolveLive2DActionPulseBinding([
      {
        actionKey: 'raise_hand_excited',
        motionName: 'Tap',
        motionIndex: 1,
      },
    ], 'raise_hand_excited')).toEqual({
      actionKey: 'raise_hand_excited',
      motionName: 'Tap',
      motionIndex: 1,
    })
  })

  it('normalizes whitespace in action cues before matching', () => {
    expect(resolveLive2DActionPulseBinding([
      {
        actionKey: 'nod_soft',
        motionName: 'Idle',
        motionIndex: 0,
      },
    ], 'nod soft')).toEqual({
      actionKey: 'nod_soft',
      motionName: 'Idle',
      motionIndex: 0,
    })
  })

  it('returns undefined when no matching cue exists', () => {
    expect(resolveLive2DActionPulseBinding([
      {
        actionKey: 'raise_hand_excited',
        motionName: 'Tap',
        motionIndex: 1,
      },
    ], 'inspect_focus')).toBeUndefined()
  })

  it('falls back to renderer-preferred motion aliases when restrained cues have no explicit motion binding', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.activeCue = {
      rendererHints: {
        preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      },
    } as unknown as NonNullable<typeof state.activeCue>

    expect(resolveLive2DActionPulseBinding([], 'observe_focus', {
      state,
      availableMotions: [
        {
          fileName: 'observe-soft.motion3.json',
          motionName: 'ObserveSoft',
          motionIndex: 0,
        },
      ],
      motionMap: {},
    })).toEqual({
      actionKey: 'observe_focus',
      motionName: 'ObserveSoft',
      motionIndex: 0,
      source: 'runtime',
    })
  })

  it('does not replay an unrelated neutral motion when no cue alias can be resolved', () => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.activeCue = {
      rendererHints: {
        preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      },
    } as unknown as NonNullable<typeof state.activeCue>

    expect(resolveLive2DActionPulseBinding([], 'observe_focus', {
      state,
      availableMotions: [
        {
          fileName: 'idle.motion3.json',
          motionName: 'Idle',
          motionIndex: 0,
        },
      ],
      motionMap: {
        'idle.motion3.json': 'Idle',
      },
    })).toBeUndefined()
  })

  it('builds a different replay key when the same motion re-enters with new identity-continuity', () => {
    const neutralState = createIdleStageEmbodimentPerformanceState()
    neutralState.activeActionCueSource = 'segment'
    neutralState.activeCue = {
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
    } as unknown as NonNullable<typeof neutralState.activeCue>
    neutralState.driverAuthority = {
      segmentId: 'segment-neutral-motion',
      rendererTarget: 'live2d',
      matchedDrivers: ['motion'],
      sources: ['segment'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      prosodyAuthority: null,
    }

    const sameHerRendererOnlyState = createIdleStageEmbodimentPerformanceState()
    sameHerRendererOnlyState.activeActionCueSource = 'segment'
    sameHerRendererOnlyState.activeCue = {
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      },
    } as unknown as NonNullable<typeof sameHerRendererOnlyState.activeCue>
    sameHerRendererOnlyState.driverAuthority = {
      segmentId: 'segment-same-her-motion',
      rendererTarget: 'live2d',
      matchedDrivers: ['motion'],
      sources: ['segment'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      prosodyAuthority: null,
    }

    const neutralKey = buildLive2DActionPulseReplayKey({
      binding: {
        actionKey: 'observe_soft',
        motionName: 'ObserveSoft',
        motionIndex: 0,
      },
      state: neutralState,
    })
    const sameHerKey = buildLive2DActionPulseReplayKey({
      binding: {
        actionKey: 'observe_soft',
        motionName: 'ObserveSoft',
        motionIndex: 0,
      },
      state: sameHerRendererOnlyState,
    })

    expect(sameHerKey).not.toBe(neutralKey)
  })
})
