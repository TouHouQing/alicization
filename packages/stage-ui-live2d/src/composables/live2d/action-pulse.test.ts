import { describe, expect, it } from 'vitest'

import { resolveLive2DActionPulseBinding } from './action-pulse'

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
})
