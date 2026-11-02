import type { AlicizationDialoguePerformancePayload } from '@proj-alicization/stage-shared'

import { createIdleStageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import { afterEach, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'

import { createStageTextDialogueDelivery, resolvePresentedTextArticulation } from './stage-text-dialogue-delivery'
import { useStageEmbodimentPerformanceRuntime } from './use-stage-embodiment-performance-runtime'

const warm: AlicizationDialoguePerformancePayload = { baseEmotion: 'happy', emotion: 'happy', facialCue: 'soft-smile', actionCue: 'nod_soft', delivery: 'gentle', emphasis: 0 }

it('keeps source mouth phase and discards expired queued glyphs without replay', () => {
  const unit = { grapheme: '啊', phoneme: 'a', script: 'pinyin' as const, offset: 0, durationMs: 230, presentedAt: 1000 }
  expect(resolvePresentedTextArticulation(unit, 'current-turn', 1100)?.startedAt).toBe(1000)
  expect(resolvePresentedTextArticulation(unit, 'current-turn', 1229)?.turnId).toBe('current-turn')
  expect(resolvePresentedTextArticulation(unit, 'current-turn', 1230)).toBeNull()
  expect(resolvePresentedTextArticulation(unit, 'current-turn', 1975)).toBeNull()
  expect(resolvePresentedTextArticulation({ ...unit, presentedAt: Number.NaN }, 'current-turn', 1100)).toBeNull()
  expect(resolvePresentedTextArticulation({ ...unit, durationMs: Number.POSITIVE_INFINITY }, 'current-turn', 1100)).toBeNull()
  expect(resolvePresentedTextArticulation({ ...unit, presentedAt: 1200 }, 'current-turn', 1100)?.startedAt).toBe(1100)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('presents semantic changes once while admitting a new gesture in the next text turn', () => {
  const delivery = createStageTextDialogueDelivery()
  expect(delivery.present(warm)).toBeNull()
  delivery.begin('turn-one')
  expect(delivery.owns('turn-one:gw1|reply')).toBe(true)
  expect(delivery.owns('turn-one-extra:gw1|reply')).toBe(false)
  expect(delivery.owns('initiative-turn')).toBe(false)
  expect(delivery.present(warm)).toEqual({ turnId: 'turn-one', issueAction: true })
  for (let chunk = 0; chunk < 100; chunk++)
    expect(delivery.present({ ...warm })).toBeNull()
  expect(delivery.present({ ...warm, baseEmotion: 'concerned', facialCue: 'soft-gaze' })?.issueAction).toBe(false)
  expect(delivery.present({ ...warm, actionCue: 'head_tilt' })?.issueAction).toBe(false)
  expect(delivery.present(warm)?.issueAction).toBe(false)
  expect(delivery.finish('stale-turn')).toBe(false)
  expect(delivery.active).toBe(true)
  expect(delivery.finish('turn-one')).toBe(true)
  expect(delivery.owns('turn-one:segment:2')).toBe(true)
  expect(delivery.present(warm)).toBeNull()
  expect(delivery.finish()).toBe(false)
  delivery.begin('turn-two')
  expect(delivery.present(warm)?.issueAction).toBe(true)
  delivery.clear()
  expect(delivery.hasTurn).toBe(false)
  expect(delivery.present(warm)).toBeNull()
})

it('prepares a header face without spending the gesture before the first visible glyph', () => {
  const delivery = createStageTextDialogueDelivery()
  delivery.begin('short-reply')
  expect(delivery.present(warm, { allowAction: false })).toEqual({ turnId: 'short-reply', issueAction: false })
  expect(delivery.present(warm, { allowAction: false })).toBeNull()
  expect(delivery.present(warm)).toEqual({ turnId: 'short-reply', issueAction: true })
  expect(delivery.present(warm)).toBeNull()
  expect(delivery.present({ ...warm, facialCue: 'relaxed' }, { allowAction: false })?.issueAction).toBe(false)
  expect(delivery.present({ ...warm, facialCue: 'relaxed' })?.issueAction).toBe(false)
})

it('holds text emotion without fabricating speech and settles without replaying gestures', () => {
  vi.useFakeTimers()
  let now = 1_000
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  const scope = effectScope()
  const speech = ref(createIdleStageEmbodimentSpeechRenderState())
  const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState: speech }))!
  const delivery = createStageTextDialogueDelivery()
  delivery.begin('text')
  const present = (payload: AlicizationDialoguePerformancePayload) => {
    const change = delivery.present(payload)
    if (change)
      runtime.armPerformance(payload, { suppressActionPulse: !change.issueAction })
  }
  present(warm)
  const revision = runtime.state.value.actionPulse.revision
  expect(revision).toBeGreaterThan(0)
  now += 1_000
  present({ ...warm, baseEmotion: 'concerned', facialCue: 'soft-gaze' })
  expect(runtime.state.value.actionPulse.revision).toBe(revision)
  expect(runtime.state.value.performance.baseEmotion).toBe('concerned')
  expect(runtime.state.value.speechActive).toBe(false)
  expect(speech.value.active).toBe(false)
  expect(speech.value.mouthOpenRatio).toBe(0)
  runtime.settleTextDialogue()
  expect(runtime.state.value.phase).toBe('cooldown')
  now += 3_120
  vi.advanceTimersByTime(3_120)
  expect(runtime.state.value.phase).toBe('idle')
  expect(runtime.state.value.actionPulse.revision).toBe(revision)
  scope.stop()
})

it('cancels text settlement when the next reply takes ownership', () => {
  vi.useFakeTimers()
  let now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  const scope = effectScope()
  const runtime = scope.run(() => useStageEmbodimentPerformanceRuntime({ speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()) }))!
  runtime.armPerformance(warm)
  runtime.settleTextDialogue()
  now = 400
  runtime.prepareForNextMessage()
  runtime.armPerformance({ ...warm, actionCue: 'head_tilt' })
  now = 4_000
  vi.advanceTimersByTime(4_000)
  expect(runtime.state.value.phase).toBe('armed')
  expect(runtime.state.value.performance.actionCue).toBe('head_tilt')
  scope.stop()
})
