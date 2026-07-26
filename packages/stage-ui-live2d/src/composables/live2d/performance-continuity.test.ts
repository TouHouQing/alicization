import { describe, expect, it } from 'vitest'

import { normalizeMotionDeltaSeconds } from './motion-time'
import { createLive2DSpeechContinuityState, resolveLive2DSpeechContinuity } from './performance-continuity'

describe('live2d speech continuity', () => {
  it('keeps speech activity alive briefly across short pauses', () => {
    const state = createLive2DSpeechContinuityState()

    const activated = resolveLive2DSpeechContinuity(state, {
      deltaSeconds: 1 / 60,
      speechActive: true,
      speechEnergy: 0.7,
      speechPhase: 'playing',
      visemeIntensity: 0.55,
    })
    const held = resolveLive2DSpeechContinuity(state, {
      deltaSeconds: 0.08,
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    })

    expect(activated.active).toBe(true)
    expect(held.active).toBe(true)
    expect(held.drive).toBeGreaterThan(0.03)
  })

  it('releases activity after hold window expires', () => {
    const state = createLive2DSpeechContinuityState()

    resolveLive2DSpeechContinuity(state, {
      deltaSeconds: 1 / 60,
      speechActive: true,
      speechEnergy: 0.65,
      speechPhase: 'playing',
      visemeIntensity: 0.5,
    })

    let tail = resolveLive2DSpeechContinuity(state, {
      deltaSeconds: 0.3,
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'idle',
      visemeIntensity: 0,
    })

    for (let i = 0; i < 8; i += 1) {
      tail = resolveLive2DSpeechContinuity(state, {
        deltaSeconds: 0.25,
        speechActive: false,
        speechEnergy: 0,
        speechPhase: 'idle',
        visemeIntensity: 0,
      })
    }

    expect(tail.active).toBe(false)
    expect(tail.drive).toBeLessThan(0.02)
  })

  it('keeps continuity alive across a longer scripted hold window when continuityHoldMs is present', () => {
    const defaultState = createLive2DSpeechContinuityState()
    const extendedState = createLive2DSpeechContinuityState()

    resolveLive2DSpeechContinuity(defaultState, {
      deltaSeconds: 1 / 60,
      speechActive: true,
      speechEnergy: 0.68,
      speechPhase: 'playing',
      visemeIntensity: 0.54,
    })
    resolveLive2DSpeechContinuity(extendedState, {
      continuityHoldMs: 320,
      deltaSeconds: 1 / 60,
      speechActive: true,
      speechEnergy: 0.68,
      speechPhase: 'playing',
      visemeIntensity: 0.54,
    })

    const defaultTail = resolveLive2DSpeechContinuity(defaultState, {
      deltaSeconds: 0.2,
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'idle',
      visemeIntensity: 0,
    })
    const extendedTail = resolveLive2DSpeechContinuity(extendedState, {
      continuityHoldMs: 320,
      deltaSeconds: 0.2,
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'idle',
      visemeIntensity: 0,
    })

    expect(extendedTail.active).toBe(true)
    expect(extendedTail.holdSeconds).toBeGreaterThan(defaultTail.holdSeconds)
    expect(extendedTail.drive).toBeGreaterThan(defaultTail.drive)
  })

  it('treats polluted audit text as behaviorally equivalent to clean audit text', () => {
    const cleanState = createLive2DSpeechContinuityState()
    const pollutedState = createLive2DSpeechContinuityState()
    const cleanInput = {
      deltaSeconds: 1 / 60,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      segmentId: 'segment-audit-equivalence',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing' as const,
      visemeIntensity: 0.56,
    }

    resolveLive2DSpeechContinuity(cleanState, cleanInput)
    resolveLive2DSpeechContinuity(pollutedState, {
      ...cleanInput,
      reasonTags: [
        'audit:untrusted-free-text',
        'legacy:renderer-note',
        'diagnostic:copied-context',
      ],
      signature: 'free-form audit payload with stale governance markers',
    })

    const cleanTail = resolveLive2DSpeechContinuity(cleanState, {
      ...cleanInput,
      deltaSeconds: 0.08,
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    })
    const pollutedTail = resolveLive2DSpeechContinuity(pollutedState, {
      ...cleanInput,
      deltaSeconds: 0.08,
      reasonTags: [
        'audit:untrusted-free-text',
        'legacy:renderer-note',
        'diagnostic:copied-context',
      ],
      signature: 'free-form audit payload with stale governance markers',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    })

    expect(pollutedTail).toEqual(cleanTail)
    expect(pollutedState.continuityKey).toBe(cleanState.continuityKey)
    expect(pollutedState.holdSeconds).toBe(cleanState.holdSeconds)
  })

  it('does not let polluted audit text alter same-segment continuity carry', () => {
    const cleanState = createLive2DSpeechContinuityState()
    const pollutedState = createLive2DSpeechContinuityState()
    const initialInput = {
      deltaSeconds: 1 / 60,
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'steady',
      residentMode: 'measured-return',
      segmentId: 'segment-audit-upgrade',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing' as const,
      visemeIntensity: 0.56,
    }

    resolveLive2DSpeechContinuity(cleanState, initialInput)
    resolveLive2DSpeechContinuity(pollutedState, {
      ...initialInput,
      reasonTags: ['audit:untrusted-free-text'],
      signature: 'free-form audit payload with stale governance markers',
    })

    const cleanTail = resolveLive2DSpeechContinuity(cleanState, {
      ...initialInput,
      deltaSeconds: 0.08,
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    })
    const pollutedTail = resolveLive2DSpeechContinuity(pollutedState, {
      ...initialInput,
      deltaSeconds: 0.08,
      reasonTags: ['audit:untrusted-free-text', 'diagnostic:copied-context'],
      signature: 'free-form audit payload with a different stale marker',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    })

    expect(pollutedTail).toEqual(cleanTail)
    expect(pollutedState.continuityKey).toBe(cleanState.continuityKey)
    expect(pollutedState.holdSeconds).toBe(cleanState.holdSeconds)
  })

  it('keeps same-thread softer return cadence alive a little longer than the default cadence', () => {
    const defaultCadenceState = createLive2DSpeechContinuityState()
    const softerCadenceState = createLive2DSpeechContinuityState()

    resolveLive2DSpeechContinuity(defaultCadenceState, {
      deltaSeconds: 1 / 60,
      residentMode: 'same-thread-continuation',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing',
      visemeIntensity: 0.56,
    })
    resolveLive2DSpeechContinuity(softerCadenceState, {
      deltaSeconds: 1 / 60,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing',
      visemeIntensity: 0.56,
    })

    const defaultCadenceTail = resolveLive2DSpeechContinuity(defaultCadenceState, {
      deltaSeconds: 0.15,
      residentMode: 'same-thread-continuation',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'idle',
      visemeIntensity: 0,
    })
    const softerCadenceTail = resolveLive2DSpeechContinuity(softerCadenceState, {
      deltaSeconds: 0.15,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'idle',
      visemeIntensity: 0,
    })

    expect(softerCadenceTail.active).toBe(true)
    expect(softerCadenceTail.holdSeconds).toBeGreaterThan(defaultCadenceTail.holdSeconds)
    expect(softerCadenceTail.drive).toBeGreaterThan(defaultCadenceTail.drive)
  })

  it('extends same-segment live2d speech carry when structured cadence upgrades', () => {
    const defaultCadenceState = createLive2DSpeechContinuityState()
    const upgradedCadenceState = createLive2DSpeechContinuityState()

    resolveLive2DSpeechContinuity(defaultCadenceState, {
      deltaSeconds: 1 / 60,
      residentMode: 'same-thread-continuation',
      segmentId: 'segment-live2d-cadence-upgrade',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing',
      visemeIntensity: 0.56,
    })
    resolveLive2DSpeechContinuity(upgradedCadenceState, {
      deltaSeconds: 1 / 60,
      residentMode: 'same-thread-continuation',
      segmentId: 'segment-live2d-cadence-upgrade',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing',
      visemeIntensity: 0.56,
    })

    const defaultCadenceTail = resolveLive2DSpeechContinuity(defaultCadenceState, {
      deltaSeconds: 0.08,
      residentMode: 'same-thread-continuation',
      segmentId: 'segment-live2d-cadence-upgrade',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    })
    const upgradedCadenceTail = resolveLive2DSpeechContinuity(upgradedCadenceState, {
      deltaSeconds: 0.08,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      segmentId: 'segment-live2d-cadence-upgrade',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    })

    expect(upgradedCadenceTail.active).toBe(true)
    expect(upgradedCadenceTail.holdSeconds).toBeGreaterThan(defaultCadenceTail.holdSeconds)
    expect(upgradedCadenceTail.drive).toBeGreaterThan(defaultCadenceTail.drive)
  })
})

describe('normalizeMotionDeltaSeconds', () => {
  it('normalizes ms values and clamps large deltas', () => {
    expect(normalizeMotionDeltaSeconds(16)).toBeCloseTo(0.016, 4)
    expect(normalizeMotionDeltaSeconds(5000)).toBe(0.25)
  })

  it('returns zero for invalid deltas', () => {
    expect(normalizeMotionDeltaSeconds(-1)).toBe(0)
    expect(normalizeMotionDeltaSeconds(Number.NaN)).toBe(0)
  })
})
