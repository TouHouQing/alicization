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
    }, null, [
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
    }, null, [
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
    }, null, [
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
    }, null, [
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
    }, null, [
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

  it('distinguishes quiet companionship attentive idles from more active attentive focus holds', () => {
    const capabilities = [
      {
        actionKey: 'observe_focus_hold',
        motionName: 'Observe',
        motionIndex: 0,
        label: 'Observe Focus Hold',
        description: 'attentive observe focus hold',
      },
      {
        actionKey: 'companion_quiet_hold',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Companion Quiet Hold',
        description: 'quiet companionship hold with soft nearby steadiness',
      },
    ]

    const quietPreference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.02,
      bodyPitch: 0.22,
      breathBoost: 0.12,
      gazeStability: 0.9,
    }, null, capabilities)
    const activePreference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.12,
      bodyPitch: 0.42,
      breathBoost: 0.32,
      gazeStability: 0.64,
    }, null, capabilities)

    expect(quietPreference?.actionKey).toBe('companion_quiet_hold')
    expect(activePreference?.actionKey).toBe('observe_focus_hold')
  })

  it('lets lower-pressure attentive posture choose a quieter nearby hold than ordinary quiet attentive posture', () => {
    const capabilities = [
      {
        actionKey: 'companion_settle_nod',
        motionName: 'Idle',
        motionIndex: 0,
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
      },
      {
        actionKey: 'nearby_quiet_hold',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Nearby Quiet Hold',
        description: 'quiet nearby companionship hold with soft steady presence',
      },
    ]

    const ordinaryQuietPreference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.02,
      bodyPitch: 0.26,
      breathBoost: 0.16,
      gazeStability: 0.84,
    }, null, capabilities)
    const lowerPressurePreference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.02,
      bodyPitch: 0.22,
      breathBoost: 0.12,
      gazeStability: 0.9,
    }, null, capabilities)

    expect(ordinaryQuietPreference?.actionKey).toBe('companion_settle_nod')
    expect(lowerPressurePreference?.actionKey).toBe('nearby_quiet_hold')
  })

  it('prefers quieter nearby attentive idle under measured-return callback restraint', () => {
    const capabilities = [
      {
        actionKey: 'observe_focus_hold',
        motionName: 'Observe',
        motionIndex: 0,
        label: 'Observe Focus Hold',
        description: 'attentive observe focus hold',
      },
      {
        actionKey: 'nearby_quiet_hold',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Nearby Quiet Hold',
        description: 'quiet nearby companionship hold with soft steady presence',
      },
    ]

    const preference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.02,
      bodyPitch: 0.22,
      breathBoost: 0.12,
      gazeStability: 0.9,
    }, {
      source: 'presence-pulse',
      embodiedPresence: 'attentive',
      confidence: 0.82,
      delivery: null,
      emphasis: 0,
      expiresAt: Date.now() + 2_000,
      reasonTags: ['quiet-companionship', 'measured-return'],
    }, capabilities)

    expect(preference?.actionKey).toBe('nearby_quiet_hold')
  })

  it('stabilizes quieter nearby attentive idle even against a stronger nod candidate when measured return has become durable relationship rhythm', () => {
    const capabilities = [
      {
        actionKey: 'companion_settle_nod',
        motionName: 'Idle',
        motionIndex: 0,
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
      },
      {
        actionKey: 'nearby_quiet_hold',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Nearby Quiet Hold',
        description: 'quiet nearby companionship hold with soft steady presence',
      },
    ]

    const preference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.02,
      bodyPitch: 0.22,
      breathBoost: 0.12,
      gazeStability: 0.9,
    }, {
      source: 'presence-pulse',
      embodiedPresence: 'attentive',
      confidence: 0.82,
      delivery: null,
      emphasis: 0,
      expiresAt: Date.now() + 2_000,
      reasonTags: ['quiet-companionship', 'measured-return', 'durable-relationship-rhythm'],
    }, capabilities)

    expect(preference?.actionKey).toBe('nearby_quiet_hold')
  })

  it('keeps lower-pressure measured-return post-release idle on a quieter nearby hold instead of warming back into a more outward attentive nod', () => {
    const capabilities = [
      {
        actionKey: 'companion_settle_nod',
        motionName: 'Idle',
        motionIndex: 0,
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
      },
      {
        actionKey: 'nearby_quiet_hold',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Nearby Quiet Hold',
        description: 'quiet nearby companionship hold with soft steady presence',
      },
      {
        actionKey: 'observe_focus_hold',
        motionName: 'Observe',
        motionIndex: 2,
        label: 'Observe Focus Hold',
        description: 'attentive observe focus hold',
      },
    ]

    const preference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.76,
      bodyYaw: 0.02,
      bodyPitch: 0.22,
      breathBoost: 0.12,
      gazeStability: 0.9,
    }, {
      source: 'presence-pulse',
      embodiedPresence: 'attentive',
      confidence: 0.84,
      delivery: null,
      emphasis: 0,
      expiresAt: Date.now() + 2_000,
      reasonTags: ['quiet-companionship', 'measured-return', 'continuity-next-open-window'],
    }, capabilities)

    expect(preference?.actionKey).toBe('nearby_quiet_hold')
  })

  it('distinguishes protective-watch concerned idles from more ordinary concerned settle motion', () => {
    const bindings = [
      {
        id: 'vrm-comfort',
        fileName: 'comfort_settle.vrma',
        actionKey: 'comfort_settle',
        label: 'Comfort Settle',
        description: 'gentle comfort settle and reassuring idle',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/comfort_settle.vrma',
      },
      {
        id: 'vrm-protective',
        fileName: 'protective_guard_hold.vrma',
        actionKey: 'protective_guard_hold',
        label: 'Protective Guard Hold',
        description: 'quiet protective watch hold that stays near without pressing',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/protective_guard_hold.vrma',
      },
    ]

    const protectivePreference = resolveVrmIdleActionPreference({
      engaged: true,
      mode: 'concerned',
      confidence: 0.82,
      bodyYaw: 0.02,
      bodyPitch: 0.3,
      breathBoost: 0.16,
      gazeStability: 0.9,
    }, null, bindings)
    const ordinaryConcernedPreference = resolveVrmIdleActionPreference({
      engaged: true,
      mode: 'concerned',
      confidence: 0.82,
      bodyYaw: 0.1,
      bodyPitch: 0.42,
      breathBoost: 0.32,
      gazeStability: 0.72,
    }, null, bindings)

    expect(protectivePreference?.binding?.actionKey).toBe('protective_guard_hold')
    expect(ordinaryConcernedPreference?.binding?.actionKey).toBe('comfort_settle')
  })

  it('prefers quieter settle-oriented vrm idles under repair-before-closeness callback restraint', () => {
    const bindings = [
      {
        id: 'vrm-observe',
        fileName: 'observe_focus_hold.vrma',
        actionKey: 'observe_focus_hold',
        label: 'Observe Focus Hold',
        description: 'attentive observe focus hold',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/observe_focus_hold.vrma',
      },
      {
        id: 'vrm-nearby-settle',
        fileName: 'nearby_settle_guard.vrma',
        actionKey: 'nearby_settle_guard',
        label: 'Nearby Settle Guard',
        description: 'quiet nearby settle guard that stays close without reopening too fast',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/nearby_settle_guard.vrma',
      },
    ]

    const preference = resolveVrmIdleActionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.02,
      bodyPitch: 0.22,
      breathBoost: 0.12,
      gazeStability: 0.9,
    }, {
      source: 'presence-pulse',
      embodiedPresence: 'attentive',
      confidence: 0.82,
      delivery: null,
      emphasis: 0,
      expiresAt: Date.now() + 2_000,
      reasonTags: ['quiet-companionship', 'repair-before-closeness'],
    }, bindings)

    expect(preference?.binding?.actionKey).toBe('nearby_settle_guard')
  })

  it('keeps live2d and vrm idle handoff on the same lower-pressure attentive line under repair-before-closeness carry', () => {
    const live2dPreference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.02,
      bodyPitch: 0.22,
      breathBoost: 0.12,
      gazeStability: 0.9,
    }, {
      source: 'presence-pulse',
      embodiedPresence: 'attentive',
      confidence: 0.82,
      delivery: null,
      emphasis: 0,
      expiresAt: Date.now() + 2_000,
      reasonTags: ['quiet-companionship', 'repair-before-closeness'],
    }, [
      {
        actionKey: 'observe_focus_hold',
        motionName: 'Observe',
        motionIndex: 0,
        label: 'Observe Focus Hold',
        description: 'attentive observe focus hold',
      },
      {
        actionKey: 'nearby_settle_guard',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Nearby Settle Guard',
        description: 'quiet nearby settle guard that stays close without reopening too fast',
      },
    ])

    const vrmPreference = resolveVrmIdleActionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.74,
      bodyYaw: 0.02,
      bodyPitch: 0.22,
      breathBoost: 0.12,
      gazeStability: 0.9,
    }, {
      source: 'presence-pulse',
      embodiedPresence: 'attentive',
      confidence: 0.82,
      delivery: null,
      emphasis: 0,
      expiresAt: Date.now() + 2_000,
      reasonTags: ['quiet-companionship', 'repair-before-closeness'],
    }, [
      {
        id: 'vrm-observe',
        fileName: 'observe_focus_hold.vrma',
        actionKey: 'observe_focus_hold',
        label: 'Observe Focus Hold',
        description: 'attentive observe focus hold',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/observe_focus_hold.vrma',
      },
      {
        id: 'vrm-nearby-settle',
        fileName: 'nearby_settle_guard.vrma',
        actionKey: 'nearby_settle_guard',
        label: 'Nearby Settle Guard',
        description: 'quiet nearby settle guard that stays close without reopening too fast',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/nearby_settle_guard.vrma',
      },
    ])

    expect(live2dPreference?.actionKey).toBe('nearby_settle_guard')
    expect(vrmPreference?.binding?.actionKey).toBe('nearby_settle_guard')
  })

  it('stabilizes the quieter nearby attentive idle under longer repair-before-closeness hold instead of drifting back to a more active nod candidate', () => {
    const capabilities = [
      {
        actionKey: 'companion_settle_nod',
        motionName: 'Idle',
        motionIndex: 0,
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
      },
      {
        actionKey: 'nearby_settle_guard',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Nearby Settle Guard',
        description: 'quiet nearby settle guard that stays close without reopening too fast',
      },
    ]

    const live2dPreference = resolveLive2DIdleMotionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.76,
      bodyYaw: 0.01,
      bodyPitch: 0.2,
      breathBoost: 0.1,
      gazeStability: 0.92,
    }, {
      source: 'presence-pulse',
      embodiedPresence: 'attentive',
      confidence: 0.84,
      delivery: null,
      emphasis: 0,
      expiresAt: Date.now() + 15_000,
      quietLineMs: 180_000,
      reasonTags: ['quiet-companionship', 'repair-before-closeness', 'durable-relationship-rhythm'],
    }, capabilities)

    const vrmPreference = resolveVrmIdleActionPreference({
      engaged: true,
      mode: 'attentive',
      confidence: 0.76,
      bodyYaw: 0.01,
      bodyPitch: 0.2,
      breathBoost: 0.1,
      gazeStability: 0.92,
    }, {
      source: 'presence-pulse',
      embodiedPresence: 'attentive',
      confidence: 0.84,
      delivery: null,
      emphasis: 0,
      expiresAt: Date.now() + 15_000,
      quietLineMs: 180_000,
      reasonTags: ['quiet-companionship', 'repair-before-closeness', 'durable-relationship-rhythm'],
    }, [
      {
        id: 'vrm-companion-settle',
        fileName: 'companion_settle_nod.vrma',
        actionKey: 'companion_settle_nod',
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/companion_settle_nod.vrma',
      },
      {
        id: 'vrm-nearby-settle',
        fileName: 'nearby_settle_guard.vrma',
        actionKey: 'nearby_settle_guard',
        label: 'Nearby Settle Guard',
        description: 'quiet nearby settle guard that stays close without reopening too fast',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/nearby_settle_guard.vrma',
      },
    ])

    expect(live2dPreference?.actionKey).toBe('nearby_settle_guard')
    expect(vrmPreference?.binding?.actionKey).toBe('nearby_settle_guard')
  })

  it('keeps resident-only repair-before-closeness durable hold on the quieter nearby idle instead of falling back to an outward attentive nod before activePresence is rebuilt', () => {
    const posture = {
      engaged: true,
      mode: 'attentive' as const,
      confidence: 0.76,
      bodyYaw: 0.01,
      bodyPitch: 0.2,
      breathBoost: 0.1,
      gazeStability: 0.92,
    }

    const residentRestraint = {
      residentMode: 'repair-before-closeness' as const,
      reasonTags: ['quiet-companionship', 'repair-before-closeness', 'durable-relationship-rhythm'],
    }

    const live2dPreference = resolveLive2DIdleMotionPreference(posture, null, [
      {
        actionKey: 'companion_settle_nod',
        motionName: 'Idle',
        motionIndex: 0,
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
      },
      {
        actionKey: 'nearby_settle_guard',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Nearby Settle Guard',
        description: 'quiet nearby settle guard that stays close without reopening too fast',
      },
    ], residentRestraint as any)

    const vrmPreference = resolveVrmIdleActionPreference(posture, null, [
      {
        id: 'vrm-companion-settle',
        fileName: 'companion_settle_nod.vrma',
        actionKey: 'companion_settle_nod',
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/companion_settle_nod.vrma',
      },
      {
        id: 'vrm-nearby-settle',
        fileName: 'nearby_settle_guard.vrma',
        actionKey: 'nearby_settle_guard',
        label: 'Nearby Settle Guard',
        description: 'quiet nearby settle guard that stays close without reopening too fast',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/nearby_settle_guard.vrma',
      },
    ], residentRestraint as any)

    expect(live2dPreference?.actionKey).toBe('nearby_settle_guard')
    expect(vrmPreference?.binding?.actionKey).toBe('nearby_settle_guard')
  })

  it('keeps vrm resident-only repair-before-closeness on the quieter nearby idle under softer runtime-visual-presence posture instead of splitting from live2d into a nod', () => {
    const posture = {
      engaged: true,
      mode: 'attentive' as const,
      confidence: 0.5131865946666667,
      bodyYaw: -0.016449234862224167,
      bodyPitch: 0.2535795718429091,
      breathBoost: 0.05237358704000001,
      gazeStability: 0.82158239136,
    }

    const residentRestraint = {
      residentMode: 'repair-before-closeness' as const,
      reasonTags: ['repair-before-closeness', 'durable-relationship-rhythm', 'timing:project-emotional-closure'],
    }

    const vrmPreference = resolveVrmIdleActionPreference(posture, null, [
      {
        id: 'vrm-companion-settle',
        fileName: 'companion_settle_nod.vrma',
        actionKey: 'companion_settle_nod',
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/companion_settle_nod.vrma',
      },
      {
        id: 'vrm-nearby-settle',
        fileName: 'nearby_settle_guard.vrma',
        actionKey: 'nearby_settle_guard',
        label: 'Nearby Settle Guard',
        description: 'quiet nearby settle guard that stays close without reopening too fast',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/nearby_settle_guard.vrma',
      },
    ], residentRestraint as any)

    expect(vrmPreference?.binding?.actionKey).toBe('nearby_settle_guard')
  })

  it('keeps vrm resident-only repair-before-closeness on the builtin settle loop when no quieter nearby guard binding exists yet', () => {
    const posture = {
      engaged: true,
      mode: 'attentive' as const,
      confidence: 0.52,
      bodyYaw: -0.01,
      bodyPitch: 0.24,
      breathBoost: 0.05,
      gazeStability: 0.82,
    }

    const residentRestraint = {
      residentMode: 'repair-before-closeness' as const,
      reasonTags: ['repair-before-closeness', 'timing:project-emotional-closure'],
    }

    const vrmPreference = resolveVrmIdleActionPreference(posture, null, [
      {
        id: 'vrm-companion-settle',
        fileName: 'companion_settle_nod.vrma',
        actionKey: 'companion_settle_nod',
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/companion_settle_nod.vrma',
      },
      {
        id: 'vrm-settle-idle',
        fileName: 'settle_idle.vrma',
        actionKey: 'settle_idle',
        label: 'Settle Idle',
        description: 'builtin restrained settle loop for repair-first callback carry',
        importedAt: 1,
        source: 'builtin' as const,
        file: '/tmp/settle_idle.vrma',
      },
    ], residentRestraint as any)

    expect(vrmPreference?.binding?.actionKey).toBe('settle_idle')
  })

  it('keeps vrm resident-only rest-protective quiet companionship on the builtin settle loop instead of warming back up into a companionship nod', () => {
    const posture = {
      engaged: true,
      mode: 'concerned' as const,
      confidence: 0.58,
      bodyYaw: -0.01,
      bodyPitch: 0.18,
      breathBoost: 0.06,
      gazeStability: 0.84,
    }

    const residentRestraint = {
      residentMode: 'quiet-companionship' as const,
      reasonTags: ['rest-protective', 'quiet-companionship', 'timing:project-emotional-closure'],
    }

    const vrmPreference = resolveVrmIdleActionPreference(posture, null, [
      {
        id: 'vrm-companion-settle',
        fileName: 'companion_settle_nod.vrma',
        actionKey: 'companion_settle_nod',
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
        importedAt: 0,
        source: 'builtin' as const,
        file: '/tmp/companion_settle_nod.vrma',
      },
      {
        id: 'vrm-settle-idle',
        fileName: 'settle_idle.vrma',
        actionKey: 'settle_idle',
        label: 'Settle Idle',
        description: 'builtin restrained settle loop for rest-protective callback carry',
        importedAt: 1,
        source: 'builtin' as const,
        file: '/tmp/settle_idle.vrma',
      },
    ], residentRestraint as any)

    expect(vrmPreference?.binding?.actionKey).toBe('settle_idle')
  })

  it('keeps live2d resident-only rest-protective quiet companionship on the builtin settle loop instead of warming back up into a companionship nod', () => {
    const posture = {
      engaged: true,
      mode: 'concerned' as const,
      confidence: 0.58,
      bodyYaw: -0.01,
      bodyPitch: 0.18,
      breathBoost: 0.06,
      gazeStability: 0.84,
    }

    const residentRestraint = {
      residentMode: 'quiet-companionship' as const,
      reasonTags: ['rest-protective', 'quiet-companionship', 'timing:project-emotional-closure'],
    }

    const live2dPreference = resolveLive2DIdleMotionPreference(posture, null, [
      {
        actionKey: 'companion_settle_nod',
        motionName: 'Idle',
        motionIndex: 0,
        label: 'Companion Settle Nod',
        description: 'attentive gentle companionship idle with a soft nod',
      },
      {
        actionKey: 'idle_settle',
        motionName: 'Idle',
        motionIndex: 1,
        label: 'Idle Settle',
        description: 'builtin restrained settle loop for rest-protective callback carry',
      },
    ], residentRestraint as any)

    expect(live2dPreference?.actionKey).toBe('idle_settle')
  })
})
