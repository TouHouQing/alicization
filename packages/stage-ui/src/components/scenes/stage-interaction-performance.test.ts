import type { AlicizationInteractionIntent, StageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'

import { createIdleStageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { projectStageInteractionPerformance } from './stage-interaction-performance'

const intent: AlicizationInteractionIntent = { version: 'interaction-intent-v1', cardId: 'alice', turnId: 'turn', purpose: 'reflect', attention: 'inward', focus: '我们的约定', reason: '先想清楚自己能确认什么', sourceRefs: ['frame:1000'], confidence: 0.8, createdAt: 1000, expiresAt: 121000 }
const context = { cardId: 'alice', now: 2000, playbackNow: 2000, paused: false, taskActive: false }
function speaking(): StageEmbodimentPerformanceState {
  return { ...createIdleStageEmbodimentPerformanceState(), phase: 'speaking', speakingStartedAt: 1000, activeSegment: { metadata: { embodimentScript: { turnId: 'turn', state: { interactionIntent: intent } } } } as any }
}
describe('semantic body projection follows actual playback and personhood', () => {
  it('looks toward a fresh observed window in desktop coordinates while retaining expression and voice ownership', () => {
    const base = speaking()
    const target = { ...intent, attention: 'shared-task' as const, target: { screenX: -700, screenY: 250, observationId: 'observed-window', observedAt: 1000 } }
    const projected = projectStageInteractionPerformance(base, target, { ...context, taskActive: true, viewport: { left: 0, top: 0, width: 500, height: 600 } })
    expect(projected.motor.gaze.azimuth).toBeLessThan(base.motor.gaze.azimuth)
    expect(projected.motor.head.yaw).toBeLessThan(base.motor.head.yaw)
    expect(projected.performance).toBe(base.performance)
    expect(projected.driverAuthority).toBe(base.driverAuthority)
    const expired = projectStageInteractionPerformance(base, target, { ...context, now: 32000, viewport: { left: 0, top: 0, width: 500, height: 600 } })
    expect(expired.motor.gaze.azimuth).toBeGreaterThanOrEqual(base.motor.gaze.azimuth)
  })
  it('preserves the canonical request for space or rest even with a confident care intention', () => {
    for (const base of [{ ...speaking(), performance: { ...speaking().performance, residentMode: 'repair-before-closeness' as const } }, { ...speaking(), residentReasonTags: ['rest-protective'] }])
      expect(projectStageInteractionPerformance(base, { ...intent, purpose: 'care' }, context)).toBe(base)
  })
  it('orients the eyes before the head and body while preserving all emotion and voice authorities', () => {
    const base = speaking()
    const early = projectStageInteractionPerformance(base, intent, { ...context, now: 1090, playbackNow: 1090 })
    expect(early.motor.gaze.azimuth).toBeGreaterThan(base.motor.gaze.azimuth)
    expect(early.motor.head).toEqual(base.motor.head)
    const held = projectStageInteractionPerformance(base, intent, context)
    expect(held.motor.head.yaw).toBeGreaterThan(base.motor.head.yaw)
    expect(held.performance).toBe(base.performance)
    expect(held.motor.facial).toBe(base.motor.facial)
    expect(held.driverAuthority).toBe(base.driverAuthority)
    expect(base.motor.head.yaw).toBe(0)
    expect(projectStageInteractionPerformance(base, intent, context)).toEqual(held)
  })
  it.each([{ paused: true }, { taskActive: true }, { cardId: 'other' }, { now: 121000 }, { now: 800 }])('yields at the scope or execution boundary %j', (override) => {
    const base = speaking()
    expect(projectStageInteractionPerformance(base, intent, { ...context, ...override })).toBe(base)
  })
  it('does not lend the current body intention to another speaking turn or another character', () => {
    const base = speaking()
    base.activeSegment!.metadata = { embodimentScript: { turnId: 'other' } }
    expect(projectStageInteractionPerformance(base, intent, context)).toBe(base)
    base.activeSegment!.metadata = { embodimentScript: { turnId: 'turn', state: { interactionIntent: { ...intent, cardId: 'other' } } } }
    expect(projectStageInteractionPerformance(base, intent, context)).toBe(base)
  })
  it('keeps epoch freshness separate from the monotonic playback clock', () => {
    const epoch = 1_800_000_000_000
    const scoped = { ...intent, createdAt: epoch, expiresAt: epoch + 120000 }
    const base = speaking()
    const early = projectStageInteractionPerformance(base, scoped, { ...context, now: epoch + 90, playbackNow: 1090 })
    expect(early.motor.gaze.azimuth).toBeGreaterThan(0)
    expect(early.motor.head).toEqual(base.motor.head)
    const settling = projectStageInteractionPerformance({ ...base, phase: 'cooldown', cooldownUntil: 2500 }, scoped, { ...context, now: epoch + 1000, playbackNow: 2000 })
    expect(settling.motor.gaze.azimuth).toBeGreaterThan(0)
    expect(settling.motor.gaze.azimuth).toBeLessThan(projectStageInteractionPerformance(base, scoped, { ...context, now: epoch + 1000 }).motor.gaze.azimuth)
  })
  it('care and deferral use opposite restrained posture and settle completely on playback release', () => {
    const base = speaking()
    const caring = { ...intent, purpose: 'care' as const, attention: 'host' as const }
    const deferring = { ...caring, purpose: 'defer' as const }
    expect(projectStageInteractionPerformance(base, caring, context).motor.body.lean).toBeGreaterThan(base.motor.body.lean)
    expect(projectStageInteractionPerformance(base, deferring, context).motor.body.lean).toBeLessThan(base.motor.body.lean)
    const released = { ...base, phase: 'cooldown' as const, cooldownUntil: 2000 }
    expect(projectStageInteractionPerformance(released, caring, context).motor).toEqual(base.motor)
    expect(projectStageInteractionPerformance({ ...base, phase: 'idle' }, caring, context).motor).toBe(base.motor)
  })
})
