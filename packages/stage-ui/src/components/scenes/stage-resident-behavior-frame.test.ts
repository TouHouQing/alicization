import { createIdleStageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { projectStageResidentBehavior } from './stage-resident-behavior-frame'

const frame = { cardId: 'alice', observedAt: 1000, mode: 'listening' as const, headYaw: 0.1, headPitch: 0.1, headRoll: 0.02, bodySway: 0.04, bodyLean: 0.09, gazeAzimuth: 0.1, gazeElevation: 0, breathScale: 1.1 }
const context = { cardId: 'alice', now: 1100, paused: false, taskActive: false, speaking: false }

describe('resident motor projection and canonical authority', () => {
  it('projects actual idle movement without changing emotion, facial cues or voice authority', () => {
    const base = createIdleStageEmbodimentPerformanceState()
    const next = projectStageResidentBehavior(base, frame, context)
    expect(next.motor.head.pitch).toBeGreaterThan(base.motor.head.pitch)
    expect(next.motor.facial).toBe(base.motor.facial)
    expect(next.performance).toBe(base.performance)
    expect(next.phase).toBe(base.phase)
    expect(base.motor.head.pitch).toBe(0)
  })

  it.each([{ paused: true }, { taskActive: true }, { speaking: true }, { cardId: 'other' }, { now: 2000 }, { now: 800 }])('yields to actual task/speech, suspension and source fences %j', (override) => {
    const base = createIdleStageEmbodimentPerformanceState()
    expect(projectStageResidentBehavior(base, frame, { ...context, ...override })).toBe(base)
  })

  it('restrains movement during negative emotion and preserves an active dialogue script', () => {
    const base = createIdleStageEmbodimentPerformanceState()
    const negative = { ...base, performance: { ...base.performance, baseEmotion: 'sad' as const } }
    const calm = projectStageResidentBehavior(base, frame, context)
    const sad = projectStageResidentBehavior(negative, frame, context)
    expect(sad.motor.head.pitch).toBeLessThan(calm.motor.head.pitch)
    expect(sad.performance.baseEmotion).toBe('sad')
    const active = { ...base, phase: 'armed' as const }
    expect(projectStageResidentBehavior(active, frame, context)).toBe(active)
  })
})
