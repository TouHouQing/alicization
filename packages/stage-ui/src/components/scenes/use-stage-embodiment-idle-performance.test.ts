import { describe, expect, it } from 'vitest'

import {
  resolveLive2DIdleMotionPreference,
  resolveVrmIdleActionPreference,
} from './use-stage-embodiment-idle-performance'

describe('stage embodiment idle performance', () => {
  it('maps hesitant posture into a more tentative live2d idle motion when available', () => {
    const preference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'hesitant',
      confidence: 0.76,
      bodyYaw: 0.1,
      bodyPitch: 0.18,
      breathBoost: 0.12,
      gazeStability: 0.64,
    }, [
      {
        actionKey: 'idle_gentle_nod',
        motionName: 'Idle',
        motionIndex: 0,
        label: '轻轻点头',
        description: 'gentle nod',
      },
      {
        actionKey: 'pout_confused',
        motionName: 'Tap@Body',
        motionIndex: 0,
        label: '惊讶疑惑闷气',
        description: 'confused pout and tentative reaction',
      },
    ])

    expect(preference).toEqual({
      mode: 'hesitant',
      confidence: 0.76,
      actionKey: 'pout_confused',
      motionName: 'Tap@Body',
      motionIndex: 0,
    })
  })

  it('falls back to settle idle for vrm when no richer posture idle action is available', () => {
    const preference = resolveVrmIdleActionPreference({
      engaged: true,
      mode: 'concerned',
      confidence: 0.84,
      bodyYaw: -0.08,
      bodyPitch: 0.36,
      breathBoost: 0.32,
      gazeStability: 0.82,
    }, [
      {
        id: 'builtin-settle-idle',
        fileName: 'idle_loop.vrma',
        actionKey: 'settle_idle',
        label: 'Settle',
        description: 'Return to the neutral idle loop to settle posture and reset the body.',
        importedAt: 0,
        source: 'builtin',
        file: '/tmp/idle_loop.vrma',
      },
    ])

    expect(preference?.mode).toBe('concerned')
    expect(preference?.confidence).toBe(0.84)
    expect(preference?.binding?.actionKey).toBe('settle_idle')
  })
})
