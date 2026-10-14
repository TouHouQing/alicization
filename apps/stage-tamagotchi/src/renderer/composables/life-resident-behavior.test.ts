import { describe, expect, it, vi } from 'vitest'

import { createLifeResidentBehavior, interruptLifeVoiceForHost } from './life-resident-behavior'

const initial = { cardId: 'alice', identitySeed: 'stable-self', now: 0, paused: false, listening: false, thinking: false, speaking: false, liveliness: 0.5 }

describe('desktop silent resident behavior from actual engagement', () => {
  it('interrupts only the current voice owner when authorized microphone detects the host', () => {
    const cancelSpeech = vi.fn()
    expect(interruptLifeVoiceForHost({ cardId: 'alice', microphoneEnabled: false, speaking: true, cancelSpeech })).toBe(false)
    expect(interruptLifeVoiceForHost({ cardId: 'alice', microphoneEnabled: true, speaking: false, cancelSpeech })).toBe(false)
    expect(cancelSpeech).not.toHaveBeenCalled()
    expect(interruptLifeVoiceForHost({ cardId: 'alice', microphoneEnabled: true, speaking: true, cancelSpeech })).toBe(true)
    expect(cancelSpeech).toHaveBeenCalledExactlyOnceWith('alice', 'host-voice-start')
  })
  it('acknowledges listening once and returns to quiet companionship without inventing speech', () => {
    const behavior = createLifeResidentBehavior()
    behavior.sample(initial)
    const samples = Array.from({ length: 100 }, (_, index) => behavior.sample({ ...initial, now: (index + 1) * 50, listening: true })!)
    expect(samples.every(frame => frame.mode === 'listening')).toBe(true)
    expect(Math.max(...samples.slice(0, 25).map(frame => frame.headPitch))).toBeGreaterThan(0.08)
    expect(samples.slice(60).every(frame => frame.headPitch < 0.001)).toBe(true)
    const quiet = behavior.sample({ ...initial, now: 5050 })!
    expect(quiet.mode).toBe('accompany')
    expect(quiet.bodyLean).toBeCloseTo(0)
    expect(quiet).not.toHaveProperty('reply')
  })

  it('reflects actual waiting and settles only after real speaking has ended', () => {
    const behavior = createLifeResidentBehavior()
    expect(behavior.sample({ ...initial, thinking: true })!.mode).toBe('thinking')
    expect(behavior.sample({ ...initial, now: 25, thinking: true, listening: true })!.mode).toBe('listening')
    for (let now = 50; now <= 800; now += 50)
      behavior.sample({ ...initial, now, thinking: true })
    expect(Math.abs(behavior.sample({ ...initial, now: 850, thinking: true })!.gazeAzimuth)).toBeGreaterThan(0.1)
    expect(behavior.sample({ ...initial, now: 900, speaking: true })!.mode).toBe('speaking')
    expect(behavior.sample({ ...initial, now: 950 })!.mode).toBe('settling')
    for (let now = 1000; now < 3500; now += 50)
      behavior.sample({ ...initial, now })
    expect(behavior.sample({ ...initial, now: 3500 })!.mode).toBe('accompany')
  })

  it('freezes elapsed behavior during hidden time and clock rollback, and clears old identity carry', () => {
    const behavior = createLifeResidentBehavior()
    behavior.sample({ ...initial, speaking: true })
    expect(behavior.sample({ ...initial, now: 60_000, paused: true })).toBeNull()
    const resumed = behavior.sample({ ...initial, now: 120_000 })!
    expect(resumed.mode).toBe('accompany')
    const rollback = behavior.sample({ ...initial, now: 1000 })!
    expect(rollback.bodySway).toBe(resumed.bodySway)
    const switched = behavior.sample({ ...initial, cardId: 'bob', now: 1050 })!
    const fresh = createLifeResidentBehavior().sample({ ...initial, cardId: 'bob', now: 1050 })!
    expect(switched).toEqual(fresh)
  })

  it('uses the adopted identity once hydration arrives and retains the same movement taste across reloads', () => {
    const hydrated = createLifeResidentBehavior()
    hydrated.sample({ ...initial, identitySeed: '' })
    const settled = hydrated.sample({ ...initial, now: 50 })!
    const fresh = createLifeResidentBehavior()
    fresh.sample(initial)
    expect(fresh.sample({ ...initial, now: 50 })).toEqual(settled)
    expect(createLifeResidentBehavior().sample({ ...initial, identitySeed: 'another-self', now: 50 })!.bodySway).not.toBe(settled.bodySway)
  })
})
