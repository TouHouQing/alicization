import { describe, expect, it } from 'vitest'

import { resolveStagePresencePulsePerformance } from './stage-presence-pulse-performance'

describe('stage presence pulse performance', () => {
  it('turns quiet accompaniment pulses into soft nearby-attention performance instead of generic attentive calm', () => {
    const performance = resolveStagePresencePulsePerformance({
      watchMode: 'symbiotic-vision',
      embodiedPresence: 'attentive',
      scenario: 'coding',
      stance: 'accompany',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'stay nearby without interrupting',
      confidence: 0.82,
      reasonTags: ['quiet-companionship'],
      emotionalTension: 'soft-covision',
      expiresAt: Date.now() + 1_000,
    })

    expect(performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focus',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }))
  })

  it('turns protective watch pulses into explicit low-pressure care performance', () => {
    const performance = resolveStagePresencePulsePerformance({
      watchMode: 'recovering',
      embodiedPresence: 'concerned',
      scenario: 'late-night-care',
      stance: 'care',
      currentBodyState: 'recovering',
      continuityMode: 'protective-watch',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'hold low-pressure care',
      confidence: 0.78,
      reasonTags: ['protective-watch'],
      emotionalTension: 'late-night-drain',
      expiresAt: Date.now() + 1_000,
    })

    expect(performance).toEqual(expect.objectContaining({
      baseEmotion: 'tired',
      emotion: 'tired',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'gentle',
      emphasis: 1,
    }))
  })

  it('keeps generic attentive pulses generic when no silent body authority is present', () => {
    const performance = resolveStagePresencePulsePerformance({
      watchMode: 'symbiotic-vision',
      embodiedPresence: 'attentive',
      scenario: 'coding',
      stance: 'observe',
      confidence: 0.72,
      reasonTags: ['semantic-friction'],
      emotionalTension: 'focused-flow',
      expiresAt: Date.now() + 1_000,
    })

    expect(performance).toEqual({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 1,
    })
  })

  it('softens non-speaking attentive pulses when long-horizon relationship timing says the opening should stay lower-pressure', () => {
    const performance = resolveStagePresencePulsePerformance({
      watchMode: 'symbiotic-vision',
      embodiedPresence: 'attentive',
      scenario: 'coding',
      stance: 'observe',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 45_000,
      currentInwardPreoccupation: 'stay nearby without reopening too fast',
      confidence: 0.8,
      reasonTags: [
        'inspection',
        'timing:lower-pressure-opening',
        'timing-source:self-evolution',
      ],
      emotionalTension: 'focused-flow',
      expiresAt: Date.now() + 1_000,
    })

    expect(performance).toEqual({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'gentle',
      emphasis: 0,
    })
  })
})
