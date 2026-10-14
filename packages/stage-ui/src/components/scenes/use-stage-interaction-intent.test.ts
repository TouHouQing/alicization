import type { AlicizationInteractionIntent } from '@proj-alicization/stage-shared'

import { createIdleStageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'

import { useStageInteractionIntent } from './use-stage-interaction-intent'

const now = 100000
function script(overrides: Partial<AlicizationInteractionIntent> = {}) {
  const intent: AlicizationInteractionIntent = { version: 'interaction-intent-v1', cardId: 'alice', turnId: 'turn', purpose: 'care', attention: 'host', focus: '现在的你', reason: '先认真听完再回应', sourceRefs: ['frame:100000'], confidence: 0.8, createdAt: now, expiresAt: now + 120000, ...overrides }
  return { version: 'embodiment-script-v1', turnId: intent.turnId, rendererTarget: 'vrm', replyText: '我在听。', state: { baseEmotion: 'neutral', delivery: 'gentle', emphasis: 0, residentMode: 'dialogue', interactionIntent: intent }, speechPlan: { segments: [], interruptPolicy: 'soft-settle', preRollMs: 0, settleMs: 180 }, facePlan: { speakingCues: [] }, motionPlan: { idleBase: 'idle_settle', actionBursts: [], attentionMode: 'attentive' }, lipsyncPlan: { mode: 'energy-only' } }
}
function harness() {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'] }).setSystemTime(now)
  const scope = effectScope()
  const cardId = ref('alice')
  const paused = ref(false)
  const taskActive = ref(false)
  const performance = ref({ ...createIdleStageEmbodimentPerformanceState(), phase: 'armed' as 'armed' | 'speaking' | 'cooldown' | 'idle', armedAt: globalThis.performance.now() })
  const runtime = scope.run(() => useStageInteractionIntent({ cardId, paused, taskActive, performance }))!
  return { scope, cardId, paused, taskActive, performance, runtime }
}
afterEach(() => vi.useRealTimers())
describe('intent ownership and interruption throughout the render lifecycle', () => {
  it('holds one intent while streaming, expires it, and disposes its timer with the component', () => {
    const h = harness()
    expect(h.runtime.accept(script())).toBe(true)
    vi.advanceTimersByTime(900)
    expect(h.runtime.performance.value.motor.body.lean).toBeGreaterThan(h.performance.value.motor.body.lean)
    expect(h.runtime.accept(script())).toBe(true)
    expect(h.runtime.intent.value?.createdAt).toBe(now)
    vi.advanceTimersByTime(119100)
    expect(h.runtime.intent.value).toBeNull()
    h.scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
  it.each(['paused', 'taskActive', 'cardId'] as const)('clears immediately on %s and never replays after returning', (key) => {
    const h = harness()
    h.runtime.accept(script())
    if (key === 'cardId')
      h.cardId.value = 'other'
    else
      h[key].value = true
    expect(h.runtime.intent.value).toBeNull()
    expect(h.runtime.accept(script())).toBe(false)
    h.paused.value = false
    h.taskActive.value = false
    h.cardId.value = 'alice'
    expect(h.runtime.intent.value).toBeNull()
    h.scope.stop()
  })
  it('rejects late old turns, equal-time competing turns, expired intent and mismatched script scope', () => {
    const h = harness()
    h.runtime.accept(script())
    expect(h.runtime.accept(script({ turnId: 'older', createdAt: now - 1, expiresAt: now + 119999 }))).toBe(false)
    expect(h.runtime.accept(script({ turnId: 'competing' }))).toBe(false)
    expect(h.runtime.accept(script({ createdAt: now - 1000, expiresAt: now }))).toBe(false)
    expect(h.runtime.accept({ ...script(), turnId: 'spoofed' })).toBe(false)
    expect(h.runtime.intent.value?.turnId).toBe('turn')
    vi.advanceTimersByTime(200)
    expect(h.runtime.accept(script({ turnId: 'new', createdAt: now + 200 }))).toBe(true)
    expect(h.runtime.intent.value?.turnId).toBe('new')
    h.scope.stop()
  })
  it('releases when playback returns to idle and when a new valid script has no prepared intent', () => {
    const h = harness()
    h.runtime.accept(script())
    h.performance.value.phase = 'speaking'
    h.performance.value.phase = 'idle'
    expect(h.runtime.intent.value).toBeNull()
    h.performance.value.phase = 'armed'
    h.runtime.accept(script())
    const next = script({ turnId: 'no-plan' })
    expect(h.runtime.accept({ ...next, state: { baseEmotion: 'neutral', delivery: 'calm' } })).toBe(false)
    expect(h.runtime.intent.value).toBeNull()
    expect(h.runtime.performance.value).toBe(h.performance.value)
    h.scope.stop()
  })
  it('retains preparation through an idle synthesis wait and uses the actual matching playback onset', () => {
    const h = harness()
    h.runtime.accept(script())
    h.performance.value.phase = 'idle'
    vi.advanceTimersByTime(2000)
    expect(h.runtime.intent.value?.turnId).toBe('turn')
    expect(h.runtime.performance.value).toBe(h.performance.value)
    h.performance.value = { ...h.performance.value, phase: 'speaking', speakingStartedAt: globalThis.performance.now(), activeSegment: { metadata: { embodimentScript: script() } } as any }
    vi.advanceTimersByTime(900)
    expect(h.runtime.performance.value.motor.body.lean).toBeGreaterThan(h.performance.value.motor.body.lean)
    h.performance.value.phase = 'cooldown'
    h.performance.value.phase = 'idle'
    expect(h.runtime.intent.value).toBeNull()
    h.scope.stop()
  })
})
