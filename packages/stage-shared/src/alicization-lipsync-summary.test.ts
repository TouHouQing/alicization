import { describe, expect, it } from 'vitest'

import {
  buildAlicizationLipsyncSummary,
  resolveLipsyncContinuityPosture,
} from './alicization-lipsync-summary'

describe('alicization lipsync summary', () => {
  it('classifies closed continuity as brief-close for shorter settling holds', () => {
    expect(resolveLipsyncContinuityPosture({
      mode: 'closed',
      continuityHoldMs: 300,
    })).toBe('brief-close')
  })

  it('classifies hybrid continuity as sustained-articulation for longer active holds', () => {
    expect(resolveLipsyncContinuityPosture({
      mode: 'energy-phoneme-hybrid',
      continuityHoldMs: 440,
    })).toBe('sustained-articulation')
  })

  it('builds a structured summary with shared lipsync execution fields in stable order', () => {
    expect(buildAlicizationLipsyncSummary({
      mode: 'energy-phoneme-hybrid',
      phase: 'playing',
      continuityHoldMs: 440,
      topViseme: 'A:0.72',
      hintTrail: 'A>U>closed',
      hintViseme: 'A',
      companionshipMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      visemeBias: 0.48,
      energyBias: 0.82,
      mouthScale: 1.08,
    })).toBe(
      'mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=440ms | topViseme=A:0.72 | hints=A>U>closed | hint=A | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.48 | energyBias=0.82 | mouthScale=1.08',
    )
  })

  it('preserves lipsync authority provenance alongside articulation hints', () => {
    expect(buildAlicizationLipsyncSummary({
      mode: 'energy-phoneme-hybrid',
      phase: 'playing',
      hintViseme: 'I',
      source: 'prosody-authority',
      confidence: 0.94,
      segmentId: 'segment-2',
    })).toBe(
      'mode=energy-phoneme-hybrid | phase=playing | hint=I | src=prosody-authority | conf=0.94 | seg=segment-2',
    )
  })

  it('can carry companionship mode and settle gaze rhythm so lipsync remains on the continuity state as face and motion', () => {
    expect(buildAlicizationLipsyncSummary({
      mode: 'closed',
      continuityHoldMs: 300,
      companionshipMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    })).toBe(
      'mode=closed | continuity=brief-close | hold=300ms | companion=repair-before-closeness | blink=quiet | gaze=soften',
    )
  })

  it('can also carry companionship reason text when lipsync is the only visible execution lane left', () => {
    expect(buildAlicizationLipsyncSummary({
      mode: 'energy-phoneme-hybrid',
      phase: 'playing',
      hintViseme: 'I',
      companionshipMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'measure closeness before re-entry so the opening keeps room',
    } as any)).toBe(
      'mode=energy-phoneme-hybrid | phase=playing | hint=I | companion=measured-return | blink=linger | gaze=soften | reason=measure closeness before re-entry so the opening keeps room',
    )
  })

  it('can also carry identity-continuity', () => {
    expect(buildAlicizationLipsyncSummary({
      mode: 'energy-phoneme-hybrid',
      phase: 'playing',
      hintViseme: 'I',
      companionshipMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Keep the continuity state inward for now, and leave room before widening outward again',
    } as any)).toBe(
      'mode=energy-phoneme-hybrid | phase=playing | hint=I | companion=measured-return | blink=linger | gaze=soften | reason=Keep the continuity state inward for now, and leave room before widening outward again',
    )
  })

  it('can carry an audible-body timing marker so lipsync stays explicitly tied to the living audio body line across surfaces', () => {
    expect(buildAlicizationLipsyncSummary({
      mode: 'energy-phoneme-hybrid',
      phase: 'idle',
      continuityHoldMs: 380,
      hintViseme: 'A',
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
      confidence: 0.91,
      segmentId: 'segment-audible-body-lipsync-1',
    })).toBe(
      'mode=energy-phoneme-hybrid | phase=idle | continuity=sustained-articulation | hold=380ms | hint=A | companion=measured-return | timing=audible-body-carry | blink=linger | gaze=soften | pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower | reason=Keep the continuity state audible while face and motion rejoin | src=prosody-authority | conf=0.91 | seg=segment-audible-body-lipsync-1',
    )
  })

  it('can also carry a quieter body-lipsync timing marker when voice has not rejoined the continuity state yet', () => {
    expect(buildAlicizationLipsyncSummary({
      mode: 'energy-phoneme-hybrid',
      phase: 'idle',
      continuityHoldMs: 380,
      hintViseme: 'A',
      companionshipMode: 'measured-return',
      continuityTiming: 'body-lipsync-carry',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Keep the continuity state inward while face, motion, and voice rejoin',
      source: 'prosody-authority',
      confidence: 0.91,
      segmentId: 'segment-body-lipsync-carry-1',
    })).toBe(
      'mode=energy-phoneme-hybrid | phase=idle | continuity=sustained-articulation | hold=380ms | hint=A | companion=measured-return | timing=body-lipsync-carry | blink=linger | gaze=soften | reason=Keep the continuity state inward while face, motion, and voice rejoin | src=prosody-authority | conf=0.91 | seg=segment-body-lipsync-carry-1',
    )
  })

  it('omits empty fragments when only the core mode and phase are available', () => {
    expect(buildAlicizationLipsyncSummary({
      mode: 'energy-only',
      phase: 'playing',
    })).toBe('mode=energy-only | phase=playing')
  })

  it('does not infer continuity posture without an explicit hold window', () => {
    expect(buildAlicizationLipsyncSummary({
      mode: 'energy-phoneme-hybrid',
      phase: 'playing',
      topViseme: 'A:0.66',
      hintTrail: 'U:0.92@0.89 src=prosody-authority segment=segment-1',
    })).toBe(
      'mode=energy-phoneme-hybrid | phase=playing | topViseme=A:0.66 | hints=U:0.92@0.89 src=prosody-authority segment=segment-1',
    )
  })
})
