import type { Live2DMotionExecutionCueSnapshot } from './motion-execution'

import { describe, expect, it } from 'vitest'

import {
  createIdleLive2DMotionExecutionState,
  createLive2DMotionExecutionStateController,

  resolveLive2DMotionExecutionState,
} from './motion-execution'

describe('live2d motion execution runtime state', () => {
  it('captures the real started motion and clears the stale action as soon as that motion finishes', () => {
    const controller = createLive2DMotionExecutionStateController()
    const auditFollowThroughCue: Live2DMotionExecutionCueSnapshot = {
      id: 'segment-observe-soft-1',
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
        reasonTags: ['audit:renderer-only'],
        signature: 'renderer audit text',
      },
      rendererSettle: {
        live2dFacialReleaseMs: 380,
        live2dMotionFollowThroughMs: 560,
      },
    }

    expect(createIdleLive2DMotionExecutionState()).toEqual({
      group: null,
      index: null,
      segmentId: null,
      cue: null,
    })

    controller.handleMotionStart('ObserveSoft', 1, 'segment-observe-soft-1', auditFollowThroughCue)
    expect(controller.state.value).toEqual({
      group: 'ObserveSoft',
      index: 1,
      segmentId: 'segment-observe-soft-1',
      cue: auditFollowThroughCue,
    })

    auditFollowThroughCue.rendererHints = {
      ...auditFollowThroughCue.rendererHints,
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
    }
    expect(controller.state.value.cue?.rendererHints?.preferredMotionAliases).toEqual(['StillnessGuard'])

    controller.handleMotionFinish()
    expect(controller.state.value).toEqual({
      group: null,
      index: null,
      segmentId: null,
      cue: null,
    })

    controller.handleMotionStart('Idle', 0, 'segment-idle-1')
    expect(controller.state.value).toEqual({
      group: 'Idle',
      index: 0,
      segmentId: 'segment-idle-1',
      cue: null,
    })
  })

  it('normalizes empty or invalid runtime motion payloads back to the idle execution state', () => {
    expect(resolveLive2DMotionExecutionState({
      group: '   ',
      index: Number.NaN,
      segmentId: 'segment-ignored',
    })).toEqual({
      group: null,
      index: null,
      segmentId: null,
      cue: null,
    })
  })
})
