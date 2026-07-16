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

  it('keeps same-thread richer still-voiced face-and-mouth continuity alive a little longer than the plainer still-voiced face line', () => {
    const stillVoicedFaceState = createLive2DSpeechContinuityState()
    const stillVoicedFaceMouthState = createLive2DSpeechContinuityState()

    resolveLive2DSpeechContinuity(stillVoicedFaceState, {
      deltaSeconds: 1 / 60,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing',
      visemeIntensity: 0.56,
    })
    resolveLive2DSpeechContinuity(stillVoicedFaceMouthState, {
      deltaSeconds: 1 / 60,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing',
      visemeIntensity: 0.56,
    })

    const stillVoicedFaceTail = resolveLive2DSpeechContinuity(stillVoicedFaceState, {
      deltaSeconds: 0.18,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'idle',
      visemeIntensity: 0,
    })
    const stillVoicedFaceMouthTail = resolveLive2DSpeechContinuity(stillVoicedFaceMouthState, {
      deltaSeconds: 0.18,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'idle',
      visemeIntensity: 0,
    })

    expect(stillVoicedFaceMouthTail.active).toBe(true)
    expect(stillVoicedFaceMouthTail.holdSeconds).toBeGreaterThan(stillVoicedFaceTail.holdSeconds)
    expect(stillVoicedFaceMouthTail.drive).toBeGreaterThan(stillVoicedFaceTail.drive)
  })

  it('extends same-segment live2d speech carry when the tail upgrades from a still-voiced face line into a richer face-and-mouth identity-continuity', () => {
    const stillVoicedFaceState = createLive2DSpeechContinuityState()
    const upgradedFaceMouthState = createLive2DSpeechContinuityState()

    resolveLive2DSpeechContinuity(stillVoicedFaceState, {
      deltaSeconds: 1 / 60,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
      segmentId: 'segment-live2d-same-line-upgrade',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing',
      visemeIntensity: 0.56,
    } as any)
    resolveLive2DSpeechContinuity(upgradedFaceMouthState, {
      deltaSeconds: 1 / 60,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
      segmentId: 'segment-live2d-same-line-upgrade',
      speechActive: true,
      speechEnergy: 0.62,
      speechPhase: 'playing',
      visemeIntensity: 0.56,
    } as any)

    const stillVoicedFaceTail = resolveLive2DSpeechContinuity(stillVoicedFaceState, {
      deltaSeconds: 0.08,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
      segmentId: 'segment-live2d-same-line-upgrade',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    } as any)
    const upgradedFaceMouthTail = resolveLive2DSpeechContinuity(upgradedFaceMouthState, {
      deltaSeconds: 0.08,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
      residentMode: 'same-thread-continuation',
      segmentId: 'segment-live2d-same-line-upgrade',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
      speechActive: false,
      speechEnergy: 0,
      speechPhase: 'stopping',
      visemeIntensity: 0,
    } as any)

    expect(upgradedFaceMouthTail.active).toBe(true)
    expect(upgradedFaceMouthTail.holdSeconds).toBeGreaterThan(stillVoicedFaceTail.holdSeconds)
    expect(upgradedFaceMouthTail.drive).toBeGreaterThan(stillVoicedFaceTail.drive)
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
