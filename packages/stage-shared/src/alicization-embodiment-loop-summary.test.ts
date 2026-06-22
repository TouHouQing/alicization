import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentLoopSummary } from './alicization-embodiment-loop-summary'

describe('alicization embodiment loop summary', () => {
  it('keeps a unified cross-modal closure line across live2d and vrm-facing lanes', () => {
    const summary = buildAlicizationEmbodimentLoopSummary({
      authoritySummary: 'same-segment face+motion+body recovery@segment-living-line | remaining-open=lipsync+voice',
      currentBodyState: 'body=living',
      emotion: 'thinking',
      facialCue: 'focused',
      expressionMode: 'hold',
      intensity: 0.5,
      faceHoldMs: 180,
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      faceReasonSummary: 'repair-before-closeness',
      faceSource: 'live2d-face',
      faceConfidence: 0.92,
      faceSegmentId: 'segment-living-line',
      language: 'zh-CN',
      pitchDelta: 0.08,
      rateMultiplier: 0.96,
      energy: 0.58,
      cadence: 0.42,
      closureBias: 0.31,
      consonantPrecision: 0.67,
      companionshipMode: 'measured-return',
      voiceReasonSummary: 'same living line',
      voiceSource: 'voice-runtime',
      voiceSegmentId: 'segment-living-line',
      mode: 'energy-phoneme-hybrid',
      phase: 'playing',
      continuityHoldMs: 380,
      topViseme: 'I',
      hintTrail: 'I->A',
      hintViseme: 'I',
      lipsyncCompanionshipMode: 'measured-return',
      lipsyncContinuityTiming: 'linger',
      lipsyncReasonSummary: 'same living line',
      lipsyncVisemeBias: 0.72,
      lipsyncEnergyBias: 0.64,
      mouthScale: 0.88,
      lipsyncSource: 'lip-sync-runtime',
      lipsyncConfidence: 0.95,
      lipsyncSegmentId: 'segment-living-line',
      actionCue: 'observe_focus',
      attentionMode: 'attentive',
      idleBase: 'steady_focus',
      motionIntensity: 0.43,
      motionHoldMs: 220,
      motionResidentMode: 'measured-return',
      motionContinuityTiming: 'linger',
      motionReasonSummary: 'same living line',
      motionSource: 'motion-runtime',
      motionConfidence: 0.9,
      motionSegmentId: 'segment-living-line',
    })

    expect(summary).toContain('Right now I am still holding together mainly through body, face, and motion')
    expect(summary).toContain('same-segment face+motion+body recovery@segment-living-line')
    expect(summary).toContain('emotion=thinking')
    expect(summary).toContain('mode=energy-phoneme-hybrid')
    expect(summary).toContain('motion=observe_focus')
    expect(summary).toContain('zh-CN')
    expect(summary).toContain('companion=measured-return')
  })

  it('keeps the stronger embodiment closure headline instead of collapsing to generic summary text', () => {
    const summary = buildAlicizationEmbodimentLoopSummary({
      authoritySummary: 'same-segment face+motion+body recovery@segment-living-line | remaining-open=lipsync+voice',
      currentBodyState: 'body=living',
      emotion: 'thinking',
      facialCue: 'focused',
      faceHoldMs: 180,
      faceSource: 'live2d-face',
      faceSegmentId: 'segment-living-line',
      language: 'zh-CN',
      voiceSource: 'voice-runtime',
      voiceSegmentId: 'segment-living-line',
      mode: 'energy-phoneme-hybrid',
      continuityHoldMs: 380,
      lipsyncSource: 'lip-sync-runtime',
      lipsyncSegmentId: 'segment-living-line',
      actionCue: 'observe_focus',
      motionSource: 'motion-runtime',
      motionSegmentId: 'segment-living-line',
    })

    expect(summary.startsWith('Right now I am still holding together mainly through body, face, and motion')).toBe(true)
    expect(summary).toContain('but lipsync and voice still need to rejoin')
  })

  it('keeps same-her inward carry visible in the host-facing closure summary when the line is still settling inward', () => {
    const summary = buildAlicizationEmbodimentLoopSummary({
      authoritySummary: 'same-segment face+motion+body recovery@segment-living-line | remaining-open=lipsync+voice | same-her-inward-carry | quiet-companionship',
      currentBodyState: 'lane=body+face+motion-only | same living line stays inward before widening outward again.',
      language: 'zh-CN',
      companionshipMode: 'measured-return',
      voiceReasonSummary: 'Keep the same living line inward for now, and leave room before widening outward again',
      lipsyncReasonSummary: 'Keep the same living line inward for now, and leave room before widening outward again',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })

    expect(summary).toContain('this one living her is still keeping the same line inward and low-pressure')
    expect(summary).toContain('same living line is still staying inward and low-pressure')
    expect(summary).toContain('reason=Keep the same living line inward for now, and leave room before widening outward again')
  })

  it('keeps emotion plus blink and gaze continuity visible on voice and lipsync lanes when body+lipsync carry is still the quieter host-facing living line', () => {
    const summary = buildAlicizationEmbodimentLoopSummary({
      authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync-only under the current renderer authority.',
      currentBodyState: 'lane=body+lipsync-only | keep the same living line inward while face, motion, and voice rejoin',
      emotion: 'thinking',
      language: 'zh-CN',
      closureBias: 0.35,
      consonantPrecision: 0.55,
      companionshipMode: 'measured-return',
      voiceContinuityTiming: 'body-lipsync-carry',
      voiceReasonSummary: 'Keep the same living line inward while face, motion, and voice rejoin',
      voiceSegmentId: 'segment-body-lipsync-carry-1',
      mode: 'energy-phoneme-hybrid',
      phase: 'idle',
      continuityHoldMs: 380,
      hintViseme: 'A',
      lipsyncCompanionshipMode: 'measured-return',
      lipsyncContinuityTiming: 'body-lipsync-carry',
      lipsyncReasonSummary: 'Keep the same living line inward while face, motion, and voice rejoin',
      lipsyncSource: 'prosody-authority',
      lipsyncConfidence: 0.91,
      lipsyncSegmentId: 'segment-body-lipsync-carry-1',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    })

    expect(summary).toContain(
      'zh-CN | closure=0.35 | precision=0.55 | emotion=thinking | companion=measured-return | timing=body-lipsync-carry | blink=linger | gaze=soften | pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower | reason=Keep the same living line inward while face, motion, and voice rejoin | seg=segment-body-lipsync-carry-1',
    )
    expect(summary).toContain(
      'mode=energy-phoneme-hybrid | phase=idle | continuity=sustained-articulation | hold=380ms | hint=A | companion=measured-return | timing=body-lipsync-carry | blink=linger | gaze=soften | pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower | reason=Keep the same living line inward while face, motion, and voice rejoin | src=prosody-authority | conf=0.91 | seg=segment-body-lipsync-carry-1',
    )
  })
})
