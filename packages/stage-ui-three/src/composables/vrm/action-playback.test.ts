import { describe, expect, it } from 'vitest'

import { resolveVrmActionFadeDurationSeconds } from './action-playback'

describe('vrm action playback helpers', () => {
  it('shortens action fade for stronger segment-grade action intensity', () => {
    const residentFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'resident',
      actionIntensity: 0.18,
      fadeDurationSeconds: 0.36,
    })

    const segmentFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.88,
      fadeDurationSeconds: 0.36,
    })

    expect(segmentFade).toBeLessThan(residentFade)
  })

  it('keeps the default fade duration when action intensity is absent', () => {
    expect(resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'preview',
      actionIntensity: null,
      fadeDurationSeconds: 0.36,
    })).toBeCloseTo(0.36, 2)
  })

  it('keeps restrained companionship resident modes softer by lengthening VRM action fade', () => {
    const measuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
    })

    const repairFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
    })

    const neutralFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'dialogue',
    })

    expect(measuredReturnFade).toBeGreaterThan(neutralFade)
    expect(repairFade).toBeGreaterThan(measuredReturnFade)
  })

  it('keeps durable softened measured-return fades slower than ordinary measured-return while preserving repair-first as the most restrained tier', () => {
    const ordinaryMeasuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'drift',
      preferredBlinkCadence: 'normal',
    })

    const durableMeasuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
    })

    const repairFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
    })

    expect(durableMeasuredReturnFade).toBeGreaterThan(ordinaryMeasuredReturnFade)
    expect(repairFade).toBeGreaterThan(durableMeasuredReturnFade)
  })

  it('still applies resident companionship restraint even when action intensity is unavailable', () => {
    const quietCompanionshipFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'resident',
      actionIntensity: null,
      fadeDurationSeconds: 0.36,
      residentMode: 'quiet-companionship',
    })

    expect(quietCompanionshipFade).toBeGreaterThan(0.36)
  })

  it('keeps repair-before-closeness segment fades guarded when renderer continuity has returned before body authority does', () => {
    const fullyMatchedFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const rendererOnlyFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: false,
    })

    expect(rendererOnlyFade).toBeGreaterThan(fullyMatchedFade)
  })

  it('keeps same-her audible-return measured-return fades slower than ordinary measured-return and still keeps repair-before-closeness on the restrained companionship tier', () => {
    const ordinaryMeasuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'steady',
      preferredBlinkCadence: 'normal',
    })

    const audibleSameHerMeasuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    })

    const audibleSameHerRepairFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'quiet',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    })

    expect(audibleSameHerMeasuredReturnFade).toBeGreaterThan(ordinaryMeasuredReturnFade)
    expect(audibleSameHerRepairFade).toBeGreaterThan(ordinaryMeasuredReturnFade)
  })

  it('keeps renderer-only same-her audible-return rejoin fades more guarded than fully matched fades on the same VRM callback line', () => {
    const fullyMatchedFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      bodySegmentMatched: true,
    })

    const rendererOnlyFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      bodySegmentMatched: false,
    })

    expect(rendererOnlyFade).toBeGreaterThan(fullyMatchedFade)
  })

  it('keeps same-her audible-return fades guarded even after residentMode relaxes into same-thread-continuation', () => {
    const neutralFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const audibleSameHerFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      bodySegmentMatched: true,
    })

    const rendererOnlyAudibleSameHerFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      bodySegmentMatched: false,
    })

    expect(audibleSameHerFade).toBeGreaterThan(neutralFade)
    expect(rendererOnlyAudibleSameHerFade).toBeGreaterThan(audibleSameHerFade)
  })

  it('treats coordinator same-her audible carry hints as guarded fades even before full body+lipsync+voice rejoin returns', () => {
    const neutralFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const coordinatorAudibleCarryFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible_same_her_line',
      reasonTags: ['embodiment:body+voice-only'],
      bodySegmentMatched: true,
    })

    const rendererOnlyCoordinatorAudibleCarryFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible_same_her_line',
      reasonTags: ['embodiment:body+voice-only'],
      bodySegmentMatched: false,
    })

    expect(coordinatorAudibleCarryFade).toBeGreaterThan(neutralFade)
    expect(rendererOnlyCoordinatorAudibleCarryFade).toBeGreaterThan(coordinatorAudibleCarryFade)
  })

  it('keeps same-thread still-voiced motion-line fades more guarded than an otherwise equally softened same-thread continuation', () => {
    const softenedSameThreadFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const stillVoicedMotionFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      reasonTags: ['embodiment:still-voiced-motion-line'],
      bodySegmentMatched: true,
    })

    const rendererOnlyStillVoicedMotionFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      reasonTags: ['embodiment:still-voiced-motion-line'],
      bodySegmentMatched: false,
    })

    expect(stillVoicedMotionFade).toBeGreaterThan(softenedSameThreadFade)
    expect(rendererOnlyStillVoicedMotionFade).toBeGreaterThan(stillVoicedMotionFade)
  })

  it.each([
    'embodiment:body+lipsync-only',
    'embodiment:lipsync+voice-only',
  ])('keeps quieter same-her fades more guarded than an otherwise equally softened same-thread continuation when continuity survives through %s', (reasonTag) => {
    const softenedSameThreadFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const quieterSameHerFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      reasonTags: [reasonTag],
      bodySegmentMatched: true,
    })

    const rendererOnlyQuieterSameHerFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      reasonTags: [reasonTag],
      bodySegmentMatched: false,
    })

    expect(quieterSameHerFade).toBeGreaterThan(softenedSameThreadFade)
    expect(rendererOnlyQuieterSameHerFade).toBeGreaterThan(quieterSameHerFade)
  })
})
