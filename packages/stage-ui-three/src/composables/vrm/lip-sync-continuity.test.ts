import type { VrmLipSyncContinuityInput } from './lip-sync-continuity'

import { describe, expect, it } from 'vitest'

import { createVrmLipSyncContinuityState, resolveVrmLipSyncContinuity } from './lip-sync-continuity'

function createInput(
  overrides: Partial<VrmLipSyncContinuityInput> = {},
): VrmLipSyncContinuityInput {
  return {
    deltaSeconds: 1 / 60,
    fallbackSignal: 0.6,
    speechActive: true,
    speechPhase: 'playing',
    wlipsyncSignal: 0.62,
    ...overrides,
  }
}

describe('vrm lip sync continuity', () => {
  it('holds activity briefly when speech enters short stopping gaps', () => {
    const state = createVrmLipSyncContinuityState()

    const active = resolveVrmLipSyncContinuity(state, createInput({
      fallbackSignal: 0.55,
      wlipsyncSignal: 0.6,
    }))
    const held = resolveVrmLipSyncContinuity(state, createInput({
      deltaSeconds: 0.1,
      fallbackSignal: 0,
      speechActive: false,
      speechPhase: 'stopping',
      wlipsyncSignal: 0,
    }))

    expect(active.active).toBe(true)
    expect(held.active).toBe(true)
    expect(held.drive).toBeGreaterThan(0.03)
  })

  it('falls back to inactive after the hold tail drains', () => {
    const state = createVrmLipSyncContinuityState()
    resolveVrmLipSyncContinuity(state, createInput())

    let tail = resolveVrmLipSyncContinuity(state, createInput({
      deltaSeconds: 0.25,
      fallbackSignal: 0,
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    }))
    for (let i = 0; i < 8; i += 1) {
      tail = resolveVrmLipSyncContinuity(state, createInput({
        deltaSeconds: 0.25,
        fallbackSignal: 0,
        speechActive: false,
        speechPhase: 'idle',
        wlipsyncSignal: 0,
      }))
    }

    expect(tail.active).toBe(false)
    expect(tail.drive).toBeLessThan(0.02)
  })

  it('keeps repair mouth continuity longer than measured return and ordinary dialogue', () => {
    const dialogueState = createVrmLipSyncContinuityState()
    const measuredReturnState = createVrmLipSyncContinuityState()
    const repairState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(dialogueState, createInput({
      residentMode: 'dialogue',
    }))
    resolveVrmLipSyncContinuity(measuredReturnState, createInput({
      residentMode: 'measured-return',
    }))
    resolveVrmLipSyncContinuity(repairState, createInput({
      residentMode: 'repair-before-closeness',
    }))

    const tailInput = {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      speechActive: false,
      speechPhase: 'idle' as const,
      wlipsyncSignal: 0,
    }
    const dialogueTail = resolveVrmLipSyncContinuity(dialogueState, {
      ...tailInput,
      residentMode: 'dialogue',
    })
    const measuredReturnTail = resolveVrmLipSyncContinuity(measuredReturnState, {
      ...tailInput,
      residentMode: 'measured-return',
    })
    const repairTail = resolveVrmLipSyncContinuity(repairState, {
      ...tailInput,
      residentMode: 'repair-before-closeness',
    })

    expect(measuredReturnTail.active).toBe(true)
    expect(repairTail.active).toBe(true)
    expect(repairTail.holdSeconds).toBeGreaterThan(measuredReturnTail.holdSeconds)
    expect(measuredReturnTail.drive).toBeGreaterThan(dialogueTail.drive)
    expect(repairTail.drive).toBeGreaterThanOrEqual(measuredReturnTail.drive)
  })

  it('uses an explicit continuity hold when it exceeds the resident default', () => {
    const state = createVrmLipSyncContinuityState()

    const active = resolveVrmLipSyncContinuity(state, createInput({
      continuityHoldMs: 320,
      residentMode: 'measured-return',
    }))
    const shortTail = resolveVrmLipSyncContinuity(state, createInput({
      continuityHoldMs: 320,
      deltaSeconds: 0.2,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    }))
    const exhaustedTail = resolveVrmLipSyncContinuity(state, createInput({
      continuityHoldMs: 320,
      deltaSeconds: 0.2,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    }))

    expect(active.holdSeconds).toBeCloseTo(0.32, 2)
    expect(shortTail.active).toBe(true)
    expect(shortTail.holdSeconds).toBeGreaterThan(0.09)
    expect(exhaustedTail.active).toBe(false)
  })

  it('does not refill the continuity hold from a stopping phase without signal', () => {
    const state = createVrmLipSyncContinuityState()
    resolveVrmLipSyncContinuity(state, createInput({
      continuityHoldMs: 320,
      residentMode: 'measured-return',
    }))

    const stoppingInput = {
      continuityHoldMs: 320,
      deltaSeconds: 0.2,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'stopping' as const,
      wlipsyncSignal: 0,
    }
    resolveVrmLipSyncContinuity(state, stoppingInput)
    const tail = resolveVrmLipSyncContinuity(state, stoppingInput)

    expect(tail.holdSeconds).toBeLessThan(0.1)
    expect(tail.drive).toBeLessThan(0.08)
  })

  it('drops prior hold carry when authority switches to a different segment', () => {
    const state = createVrmLipSyncContinuityState()

    const first = resolveVrmLipSyncContinuity(state, createInput({
      continuityHoldMs: 320,
      residentMode: 'measured-return',
      segmentId: 'segment-mouth-1',
    }))
    const switched = resolveVrmLipSyncContinuity(state, createInput({
      continuityHoldMs: 0,
      deltaSeconds: 0.08,
      fallbackSignal: 0,
      residentMode: 'dialogue',
      segmentId: 'segment-mouth-2',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    }))

    expect(first.active).toBe(true)
    expect(switched.active).toBe(false)
    expect(switched.holdSeconds).toBe(0)
    expect(switched.drive).toBeLessThan(0.02)
  })
})
