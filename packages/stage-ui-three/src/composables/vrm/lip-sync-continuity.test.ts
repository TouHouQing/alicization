import { describe, expect, it } from 'vitest'

import { createVrmLipSyncContinuityState, resolveVrmLipSyncContinuity } from './lip-sync-continuity'

describe('vrm lip sync continuity', () => {
  it('holds activity briefly when speech enters short stopping gaps', () => {
    const state = createVrmLipSyncContinuityState()

    const active = resolveVrmLipSyncContinuity(state, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.55,
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.6,
    })
    const held = resolveVrmLipSyncContinuity(state, {
      deltaSeconds: 0.1,
      fallbackSignal: 0,
      speechActive: false,
      speechPhase: 'stopping',
      wlipsyncSignal: 0,
    })

    expect(active.active).toBe(true)
    expect(held.active).toBe(true)
    expect(held.drive).toBeGreaterThan(0.03)
  })

  it('falls back to inactive after the hold tail drains', () => {
    const state = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(state, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    let tail = resolveVrmLipSyncContinuity(state, {
      deltaSeconds: 0.4,
      fallbackSignal: 0,
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    for (let i = 0; i < 8; i += 1) {
      tail = resolveVrmLipSyncContinuity(state, {
        deltaSeconds: 0.25,
        fallbackSignal: 0,
        speechActive: false,
        speechPhase: 'idle',
        wlipsyncSignal: 0,
      })
    }

    expect(tail.active).toBe(false)
    expect(tail.drive).toBeLessThan(0.02)
  })

  it('keeps repair-before-closeness mouth continuity alive longer than measured-return, and measured-return longer than ordinary dialogue', () => {
    const dialogueState = createVrmLipSyncContinuityState()
    const measuredReturnState = createVrmLipSyncContinuityState()
    const repairState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(dialogueState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      residentMode: 'dialogue',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(measuredReturnState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(repairState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      residentMode: 'repair-before-closeness',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const dialogueTail = resolveVrmLipSyncContinuity(dialogueState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      residentMode: 'dialogue',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const measuredReturnTail = resolveVrmLipSyncContinuity(measuredReturnState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const repairTail = resolveVrmLipSyncContinuity(repairState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      residentMode: 'repair-before-closeness',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(measuredReturnTail.active).toBe(true)
    expect(repairTail.active).toBe(true)
    expect(repairTail.holdSeconds).toBeGreaterThan(measuredReturnTail.holdSeconds)
    expect(measuredReturnTail.drive).toBeGreaterThan(dialogueTail.drive)
    expect(repairTail.drive).toBeGreaterThanOrEqual(measuredReturnTail.drive)
  })

  it('keeps audible same-her measured-return continuity more inward than ordinary measured-return while preserving repair-first as the most restrained tier', () => {
    const measuredReturnState = createVrmLipSyncContinuityState()
    const audibleSameHerState = createVrmLipSyncContinuityState()
    const repairState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(measuredReturnState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(audibleSameHerState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      residentMode: 'measured-return',
      signature: 'embodiment:audible-same-her-line',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(repairState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      residentMode: 'repair-before-closeness',
      signature: 'embodiment:audible-same-her-line',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const measuredReturnTail = resolveVrmLipSyncContinuity(measuredReturnState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const audibleSameHerTail = resolveVrmLipSyncContinuity(audibleSameHerState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      residentMode: 'measured-return',
      signature: 'embodiment:audible-same-her-line',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const repairTail = resolveVrmLipSyncContinuity(repairState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      residentMode: 'repair-before-closeness',
      signature: 'embodiment:audible-same-her-line',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(audibleSameHerTail.active).toBe(true)
    expect(repairTail.active).toBe(true)
    expect(audibleSameHerTail.holdSeconds).toBeGreaterThan(measuredReturnTail.holdSeconds)
    expect(repairTail.holdSeconds).toBeGreaterThan(audibleSameHerTail.holdSeconds)
    expect(audibleSameHerTail.drive).toBeGreaterThan(measuredReturnTail.drive)
    expect(repairTail.drive).toBeGreaterThanOrEqual(audibleSameHerTail.drive)
  })

  it('keeps quieter body+lipsync-only measured-return continuity more inward than ordinary measured-return without overstating it into audible-body carry', () => {
    const measuredReturnState = createVrmLipSyncContinuityState()
    const bodyLipsyncState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(measuredReturnState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(bodyLipsyncState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body+lipsync-only'],
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const measuredReturnTail = resolveVrmLipSyncContinuity(measuredReturnState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const bodyLipsyncTail = resolveVrmLipSyncContinuity(bodyLipsyncState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body+lipsync-only'],
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(bodyLipsyncTail.active).toBe(true)
    expect(bodyLipsyncTail.holdSeconds).toBeGreaterThan(measuredReturnTail.holdSeconds)
    expect(bodyLipsyncTail.drive).toBeGreaterThan(measuredReturnTail.drive)
  })

  it('keeps coordinator-style freeform body+voice-only measured-return continuity more inward than an otherwise equally softened measured-return', () => {
    const softenedMeasuredReturnState = createVrmLipSyncContinuityState()
    const bodyVoiceState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(softenedMeasuredReturnState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(bodyVoiceState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body+voice-only'],
      residentMode: 'measured-return',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const softenedMeasuredReturnTail = resolveVrmLipSyncContinuity(softenedMeasuredReturnState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const bodyVoiceTail = resolveVrmLipSyncContinuity(bodyVoiceState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body+voice-only'],
      residentMode: 'measured-return',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(bodyVoiceTail.active).toBe(true)
    expect(bodyVoiceTail.holdSeconds).toBeGreaterThan(softenedMeasuredReturnTail.holdSeconds)
    expect(bodyVoiceTail.drive).toBeGreaterThan(softenedMeasuredReturnTail.drive)
  })

  it('keeps coordinator-style freeform body+voice-only repair-before-closeness continuity on a stricter resident mouth line than an otherwise equally softened repair-first return', () => {
    const softenedRepairState = createVrmLipSyncContinuityState()
    const bodyVoiceRepairState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(softenedRepairState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'repair-before-closeness',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(bodyVoiceRepairState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body+voice-only'],
      residentMode: 'repair-before-closeness',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const softenedRepairTail = resolveVrmLipSyncContinuity(softenedRepairState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'repair-before-closeness',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const bodyVoiceRepairTail = resolveVrmLipSyncContinuity(bodyVoiceRepairState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body+voice-only'],
      residentMode: 'repair-before-closeness',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(bodyVoiceRepairTail.active).toBe(true)
    expect(bodyVoiceRepairTail.holdSeconds).toBeGreaterThan(softenedRepairTail.holdSeconds)
    expect(bodyVoiceRepairTail.drive).toBeGreaterThan(softenedRepairTail.drive)
  })

  it('keeps lipsync+voice-only measured-return continuity more inward than ordinary measured-return without overstating it into audible-body carry', () => {
    const measuredReturnState = createVrmLipSyncContinuityState()
    const lipsyncVoiceState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(measuredReturnState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(lipsyncVoiceState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:lipsync+voice-only'],
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const measuredReturnTail = resolveVrmLipSyncContinuity(measuredReturnState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const lipsyncVoiceTail = resolveVrmLipSyncContinuity(lipsyncVoiceState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:lipsync+voice-only'],
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(lipsyncVoiceTail.active).toBe(true)
    expect(lipsyncVoiceTail.holdSeconds).toBeGreaterThan(measuredReturnTail.holdSeconds)
    expect(lipsyncVoiceTail.drive).toBeGreaterThan(measuredReturnTail.drive)
  })

  it('keeps face+lipsync-only measured-return continuity more inward than an otherwise equally softened measured-return', () => {
    const softenedMeasuredReturnState = createVrmLipSyncContinuityState()
    const faceLipsyncState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(softenedMeasuredReturnState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(faceLipsyncState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['lane=face+lipsync-only'],
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const softenedMeasuredReturnTail = resolveVrmLipSyncContinuity(softenedMeasuredReturnState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const faceLipsyncTail = resolveVrmLipSyncContinuity(faceLipsyncState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['lane=face+lipsync-only'],
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(faceLipsyncTail.active).toBe(true)
    expect(faceLipsyncTail.holdSeconds).toBeGreaterThan(softenedMeasuredReturnTail.holdSeconds)
    expect(faceLipsyncTail.drive).toBeGreaterThan(softenedMeasuredReturnTail.drive)
  })

  it('keeps motion+lipsync-only measured-return continuity more inward than an otherwise equally softened measured-return', () => {
    const softenedMeasuredReturnState = createVrmLipSyncContinuityState()
    const motionLipsyncState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(softenedMeasuredReturnState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(motionLipsyncState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['lane=motion+lipsync-only'],
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const softenedMeasuredReturnTail = resolveVrmLipSyncContinuity(softenedMeasuredReturnState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const motionLipsyncTail = resolveVrmLipSyncContinuity(motionLipsyncState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['lane=motion+lipsync-only'],
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(motionLipsyncTail.active).toBe(true)
    expect(motionLipsyncTail.holdSeconds).toBeGreaterThan(softenedMeasuredReturnTail.holdSeconds)
    expect(motionLipsyncTail.drive).toBeGreaterThan(softenedMeasuredReturnTail.drive)
  })

  it('keeps same-thread still-voiced face-line continuity more inward than an otherwise equally softened same-thread continuation', () => {
    const softenedSameThreadState = createVrmLipSyncContinuityState()
    const stillVoicedFaceState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(softenedSameThreadState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(stillVoicedFaceState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const softenedSameThreadTail = resolveVrmLipSyncContinuity(softenedSameThreadState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const stillVoicedFaceTail = resolveVrmLipSyncContinuity(stillVoicedFaceState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(stillVoicedFaceTail.active).toBe(true)
    expect(stillVoicedFaceTail.holdSeconds).toBeGreaterThan(softenedSameThreadTail.holdSeconds)
    expect(stillVoicedFaceTail.drive).toBeGreaterThan(softenedSameThreadTail.drive)
  })

  it('keeps same-thread richer still-voiced face-and-mouth continuity alive a little longer than the plainer still-voiced face line', () => {
    const stillVoicedFaceState = createVrmLipSyncContinuityState()
    const stillVoicedFaceMouthState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(stillVoicedFaceState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(stillVoicedFaceMouthState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const stillVoicedFaceTail = resolveVrmLipSyncContinuity(stillVoicedFaceState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-line'],
      residentMode: 'same-thread-continuation',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const stillVoicedFaceMouthTail = resolveVrmLipSyncContinuity(stillVoicedFaceMouthState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-lipsync-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(stillVoicedFaceMouthTail.active).toBe(true)
    expect(stillVoicedFaceMouthTail.holdSeconds).toBeGreaterThan(stillVoicedFaceTail.holdSeconds)
    expect(stillVoicedFaceMouthTail.drive).toBeGreaterThan(stillVoicedFaceTail.drive)
  })

  it('keeps same-thread still-voiced motion-line signature-only continuity more inward than an otherwise equally softened same-thread continuation', () => {
    const softenedSameThreadState = createVrmLipSyncContinuityState()
    const stillVoicedMotionState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(softenedSameThreadState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(stillVoicedMotionState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|still-voiced-motion-line',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const softenedSameThreadTail = resolveVrmLipSyncContinuity(softenedSameThreadState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const stillVoicedMotionTail = resolveVrmLipSyncContinuity(stillVoicedMotionState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|still-voiced-motion-line',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(stillVoicedMotionTail.active).toBe(true)
    expect(stillVoicedMotionTail.holdSeconds).toBeGreaterThan(softenedSameThreadTail.holdSeconds)
    expect(stillVoicedMotionTail.drive).toBeGreaterThan(softenedSameThreadTail.drive)
  })

  it('keeps same-thread richer still-voiced motion-and-mouth continuity alive a little longer than the plainer still-voiced motion line', () => {
    const stillVoicedMotionState = createVrmLipSyncContinuityState()
    const stillVoicedMotionMouthState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(stillVoicedMotionState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|still-voiced-motion-line',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(stillVoicedMotionMouthState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-motion-lipsync-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-lipsync-line|lane=motion+lipsync+voice-only',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const stillVoicedMotionTail = resolveVrmLipSyncContinuity(stillVoicedMotionState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|still-voiced-motion-line',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const stillVoicedMotionMouthTail = resolveVrmLipSyncContinuity(stillVoicedMotionMouthState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-motion-lipsync-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-lipsync-line|lane=motion+lipsync+voice-only',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(stillVoicedMotionMouthTail.active).toBe(true)
    expect(stillVoicedMotionMouthTail.holdSeconds).toBeGreaterThan(stillVoicedMotionTail.holdSeconds)
    expect(stillVoicedMotionMouthTail.drive).toBeGreaterThan(stillVoicedMotionTail.drive)
  })

  it('keeps same-thread richer still-voiced face-and-motion continuity more inward than an otherwise equally softened same-thread continuation', () => {
    const softenedSameThreadState = createVrmLipSyncContinuityState()
    const stillVoicedFaceMotionState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(softenedSameThreadState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })
    resolveVrmLipSyncContinuity(stillVoicedFaceMotionState, {
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.6,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-motion-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line|lane=face+motion+voice-only',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.62,
    })

    const softenedSameThreadTail = resolveVrmLipSyncContinuity(softenedSameThreadState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'same-thread-continuation',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const stillVoicedFaceMotionTail = resolveVrmLipSyncContinuity(stillVoicedFaceMotionState, {
      deltaSeconds: 0.18,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:still-voiced-face-motion-line'],
      residentMode: 'same-thread-continuation',
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line|lane=face+motion+voice-only',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(stillVoicedFaceMotionTail.active).toBe(true)
    expect(stillVoicedFaceMotionTail.holdSeconds).toBeGreaterThan(softenedSameThreadTail.holdSeconds)
    expect(stillVoicedFaceMotionTail.drive).toBeGreaterThan(softenedSameThreadTail.drive)
  })

  it('respects later-segment digital-life continuity hold when it is longer than the default measured-return tail', () => {
    const state = createVrmLipSyncContinuityState()

    const active = resolveVrmLipSyncContinuity(state, {
      continuityHoldMs: 320,
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.58,
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.6,
    })
    const shortTail = resolveVrmLipSyncContinuity(state, {
      continuityHoldMs: 320,
      deltaSeconds: 0.2,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const exhaustedTail = resolveVrmLipSyncContinuity(state, {
      continuityHoldMs: 320,
      deltaSeconds: 0.2,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(active.holdSeconds).toBeCloseTo(0.32, 2)
    expect(shortTail.active).toBe(true)
    expect(shortTail.holdSeconds).toBeGreaterThan(0.09)
    expect(exhaustedTail.active).toBe(false)
  })

  it('does not keep refilling the continuity hold forever just because speech stays in stopping with no real lipsync signal', () => {
    const state = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(state, {
      continuityHoldMs: 320,
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.58,
      residentMode: 'measured-return',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.6,
    })

    let tail = resolveVrmLipSyncContinuity(state, {
      continuityHoldMs: 320,
      deltaSeconds: 0.2,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'stopping',
      wlipsyncSignal: 0,
    })
    tail = resolveVrmLipSyncContinuity(state, {
      continuityHoldMs: 320,
      deltaSeconds: 0.2,
      fallbackSignal: 0,
      residentMode: 'measured-return',
      speechActive: false,
      speechPhase: 'stopping',
      wlipsyncSignal: 0,
    })

    expect(tail.holdSeconds).toBeLessThan(0.1)
    expect(tail.drive).toBeLessThan(0.08)
  })

  it('drops prior hold carry when authority switches to a different segment', () => {
    const state = createVrmLipSyncContinuityState()

    const first = resolveVrmLipSyncContinuity(state, {
      continuityHoldMs: 320,
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.58,
      residentMode: 'measured-return',
      segmentId: 'segment-same-her-1',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.6,
    })
    const switched = resolveVrmLipSyncContinuity(state, {
      continuityHoldMs: 0,
      deltaSeconds: 0.08,
      fallbackSignal: 0,
      residentMode: 'dialogue',
      segmentId: 'segment-fresh-reply-2',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(first.active).toBe(true)
    expect(switched.active).toBe(false)
    expect(switched.holdSeconds).toBe(0)
    expect(switched.drive).toBeLessThan(0.02)
  })

  it('refreshes same-segment continuity hold when same-her body+voice carry arrives during the stop tail', () => {
    const controlState = createVrmLipSyncContinuityState()
    const refreshedState = createVrmLipSyncContinuityState()

    resolveVrmLipSyncContinuity(controlState, {
      continuityHoldMs: 0,
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.58,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      segmentId: 'segment-same-her-1',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.6,
    })
    resolveVrmLipSyncContinuity(refreshedState, {
      continuityHoldMs: 0,
      deltaSeconds: 1 / 60,
      fallbackSignal: 0.58,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      segmentId: 'segment-same-her-1',
      speechActive: true,
      speechPhase: 'playing',
      wlipsyncSignal: 0.6,
    })

    const controlTail = resolveVrmLipSyncContinuity(controlState, {
      continuityHoldMs: 0,
      deltaSeconds: 0.12,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
      segmentId: 'segment-same-her-1',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })
    const refreshedTail = resolveVrmLipSyncContinuity(refreshedState, {
      continuityHoldMs: 0,
      deltaSeconds: 0.12,
      fallbackSignal: 0,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body+voice-only'],
      residentMode: 'measured-return',
      segmentId: 'segment-same-her-1',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      speechActive: false,
      speechPhase: 'idle',
      wlipsyncSignal: 0,
    })

    expect(refreshedTail.active).toBe(true)
    expect(refreshedTail.holdSeconds).toBeGreaterThan(controlTail.holdSeconds)
    expect(refreshedTail.drive).toBeGreaterThan(controlTail.drive)
  })
})
