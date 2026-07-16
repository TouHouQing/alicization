import { describe, expect, it } from 'vitest'

import { buildAlicizationFaceSummary } from './alicization-face-summary'

describe('alicization face summary', () => {
  it('builds a structured face summary with stable field order', () => {
    expect(buildAlicizationFaceSummary({
      emotion: 'thinking',
      facialCue: 'focused',
      expressionMode: 'hold',
      intensity: 0.46,
      holdMs: 420,
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'eyes-soften',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Deliver the result on the same living thread, but leave room before widening closeness',
      source: 'prosody-authority',
      confidence: 0.94,
      segmentId: 'segment-1',
    })).toBe(
      'emotion=thinking | cue=focused | expression=hold | intensity=0.46 | hold=420ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | blink=linger | gaze=soften | reason=Deliver the result on the continuity_thread, but leave room before widening closeness | src=prosody-authority | conf=0.94 | seg=segment-1',
    )
  })

  it('omits empty fragments when only the facial cue is available', () => {
    expect(buildAlicizationFaceSummary({
      facialCue: 'soft-gaze',
    })).toBe('cue=soft-gaze')
  })

  it('does not coerce null numeric fields into fake zeros', () => {
    expect(buildAlicizationFaceSummary({
      emotion: 'thinking',
      confidence: null,
      holdMs: null,
      intensity: null,
      segmentId: null,
    })).toBe('emotion=thinking')
  })

  it('can carry identity-continuity', () => {
    expect(buildAlicizationFaceSummary({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Keep the continuity state inward for now, and leave room before widening outward again',
    })).toBe(
      'emotion=thinking | cue=soft-gaze | mode=measured-return | blink=linger | gaze=soften | reason=continuity_hold=measured_return; direction=inward; widening=deferred; pressure=lower',
    )
  })

  it('can carry an audible-body timing marker when measured-return face cues are still holding the living line as voice and motion rejoin', () => {
    expect(buildAlicizationFaceSummary({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      expressionMode: 'hold',
      residentMode: 'measured-return',
      continuityTiming: 'audible-body-carry',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Keep the continuity state audible while face and motion rejoin',
      holdMs: 360,
      source: 'timeline-projection',
      confidence: 0.9,
      segmentId: 'segment-audible-body-face-1',
    })).toBe(
      'emotion=thinking | cue=soft-gaze | expression=hold | hold=360ms | mode=measured-return | timing=audible-body-carry | blink=linger | gaze=soften | reason=continuity_hold=audible_body_carry; rejoin=face+motion | src=timeline-projection | conf=0.90 | seg=segment-audible-body-face-1',
    )
  })
})
