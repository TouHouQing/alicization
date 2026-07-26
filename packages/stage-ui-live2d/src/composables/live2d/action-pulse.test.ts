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

  it('keeps audit metadata out of replay keys while preserving structured driver authority', () => {
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

    const auditedState = createIdleStageEmbodimentPerformanceState()
    auditedState.activeActionCueSource = 'segment'
    auditedState.activeCue = {
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'renderer audit text',
        reasonTags: ['audit:renderer-only'],
      },
    } as unknown as NonNullable<typeof auditedState.activeCue>
    auditedState.driverAuthority = {
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

    const rendererOnlyState = createIdleStageEmbodimentPerformanceState()
    rendererOnlyState.activeActionCueSource = 'segment'
    rendererOnlyState.activeCue = {
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
    } as unknown as NonNullable<typeof rendererOnlyState.activeCue>
    rendererOnlyState.driverAuthority = {
      segmentId: 'segment-renderer-motion',
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
    const auditedKey = buildLive2DActionPulseReplayKey({
      binding: {
        actionKey: 'observe_soft',
        motionName: 'ObserveSoft',
        motionIndex: 0,
      },
      state: auditedState,
    })
    const rendererOnlyKey = buildLive2DActionPulseReplayKey({
      binding: {
        actionKey: 'observe_soft',
        motionName: 'ObserveSoft',
        motionIndex: 0,
      },
      state: rendererOnlyState,
    })

    expect(auditedKey).toBe(neutralKey)
    expect(rendererOnlyKey).not.toBe(neutralKey)
  })
})
