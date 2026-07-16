import { describe, expect, it } from 'vitest'

import { buildAlicizationVoiceSummary } from './alicization-voice-summary'

describe('alicization voice summary', () => {
  it('builds a structured voice summary with stable field order when the voiced lane also needs to expose explicit emotion authority', () => {
    expect(buildAlicizationVoiceSummary({
      language: 'zh-CN',
      pitchDelta: 1,
      rateMultiplier: 1,
      energy: 0.42,
      cadence: 0.38,
      closureBias: 0.84,
      consonantPrecision: 0.9,
      emotion: 'thinking',
      companionshipMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Deliver the result on the same living thread, but leave room before widening closeness',
      source: 'prosody-authority',
      segmentId: 'segment-1',
    })).toBe(
      'zh-CN | pitch=1.00 | rate=1.00 | energy=0.42 | cadence=0.38 | closure=0.84 | precision=0.90 | emotion=thinking | companion=measured-return | blink=linger | gaze=soften | reason=Deliver the result on the continuity_thread, but leave room before widening closeness | src=prosody-authority | seg=segment-1',
    )
  })

  it('omits empty fragments when only cadence evidence is available', () => {
    expect(buildAlicizationVoiceSummary({
      cadence: 0.38,
    })).toBe('cadence=0.38')
  })

  it('can carry identity-continuity', () => {
    expect(buildAlicizationVoiceSummary({
      language: 'zh-CN',
      companionshipMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Keep the continuity state inward for now, and leave room before widening outward again',
    })).toBe(
      'zh-CN | companion=measured-return | blink=linger | gaze=soften | reason=continuity_hold=measured_return; direction=inward; widening=deferred; pressure=lower',
    )
  })

  it('can carry an audible-body timing marker when the voiced line is still the lower-pressure identity-continuity', () => {
    expect(buildAlicizationVoiceSummary({
      language: 'zh-CN',
      closureBias: 0.35,
      consonantPrecision: 0.55,
      emotion: 'thinking',
      companionshipMode: 'measured-return',
      continuityTiming: 'audible-body-carry',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      reasonSummary: 'Keep the continuity state audible while face and motion rejoin',
      source: 'prosody-authority',
      segmentId: 'segment-audible-body-voice-1',
    })).toBe(
      'zh-CN | closure=0.35 | precision=0.55 | emotion=thinking | companion=measured-return | timing=audible-body-carry | blink=linger | gaze=soften | pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower | reason=continuity_hold=audible_body_carry; rejoin=face+motion | src=prosody-authority | seg=segment-audible-body-voice-1',
    )
  })

  it('can surface repair-first concern on the voiced lane when closeness still must not outrun truth and repair', () => {
    expect(buildAlicizationVoiceSummary({
      emotion: 'concerned',
      companionshipMode: 'repair-before-closeness',
      continuityTiming: 'next-open-window',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      reasonSummary: 'keep callback facts structured',
      segmentId: 'segment-repair-first-same-her-inward-carry',
    })).toBe(
      'emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=continuity_hold=repair_before_closeness; target=callback; repair=settle_first; widening=deferred | seg=segment-repair-first-same-her-inward-carry',
    )
  })
})
