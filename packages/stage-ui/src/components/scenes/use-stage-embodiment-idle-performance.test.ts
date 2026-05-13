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

  it('prefers comfort and settle recovering idles over energetic options', () => {
    const live2dPreference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'concerned',
      confidence: 0.81,
      bodyYaw: 0.04,
      bodyPitch: 0.3,
      breathBoost: 0.18,
      gazeStability: 0.88,
    }, [
      {
        actionKey: 'cheer_jump',
        motionName: 'Cheer',
        motionIndex: 0,
        label: 'Cheer Jump',
        description: 'excited cheer and bounce',
      },
      {
        actionKey: 'comfort_settle',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Comfort Settle',
        description: 'gentle comfort settle and reassuring idle',
      },
    ])

    expect(live2dPreference).toEqual({
      mode: 'concerned',
      confidence: 0.81,
      actionKey: 'comfort_settle',
      motionName: 'Idle',
      motionIndex: 1,
    })

    const vrmPreference = resolveVrmIdleActionPreference({
      engaged: true,
      mode: 'concerned',
      confidence: 0.81,
      bodyYaw: 0.04,
      bodyPitch: 0.3,
      breathBoost: 0.18,
      gazeStability: 0.88,
    }, [
      {
        id: 'vrm-cheer',
        fileName: 'cheer.vrma',
        actionKey: 'cheer_jump',
        label: 'Cheer Jump',
        description: 'excited cheer and bounce',
        importedAt: 0,
        source: 'builtin',
        file: '/tmp/cheer.vrma',
      },
      {
        id: 'vrm-comfort',
        fileName: 'comfort_settle.vrma',
        actionKey: 'comfort_settle',
        label: 'Comfort Settle',
        description: 'gentle comfort settle and reassuring idle',
        importedAt: 0,
        source: 'builtin',
        file: '/tmp/comfort_settle.vrma',
      },
    ])

    expect(vrmPreference?.binding?.actionKey).toBe('comfort_settle')
  })

  it('prefers companionship-safe attentive idles over flat or energetic choices', () => {
    const preference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.06,
      bodyPitch: 0.24,
      breathBoost: 0.16,
      gazeStability: 0.8,
    }, [
      {
        actionKey: 'neutral_loop',
        motionName: 'Loop',
        motionIndex: 0,
        label: 'Neutral Loop',
        description: 'flat neutral loop',
      },
      {
        actionKey: 'companion_settle_nod',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
      },
      {
        actionKey: 'excited_wave',
        motionName: 'Wave',
        motionIndex: 0,
        label: 'Excited Wave',
        description: 'energetic excited wave',
      },
    ])

    expect(preference).toEqual({
      mode: 'attentive',
      confidence: 0.74,
      actionKey: 'companion_settle_nod',
      motionName: 'Idle',
      motionIndex: 1,
    })
  })
})
