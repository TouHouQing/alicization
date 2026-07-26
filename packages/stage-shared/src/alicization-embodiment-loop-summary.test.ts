import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentLoopSummary } from './alicization-embodiment-loop-summary'

describe('alicization embodiment loop summary', () => {
  it('keeps natural closure facts with the real live2d and vrm-facing lane facts', () => {
    const summary = buildAlicizationEmbodimentLoopSummary({
      authoritySummary: 'embodiment_lanes=body+face+motion | pending_lanes=lipsync+voice',
      currentBodyState: 'body continuity remains present while lipsync and voice rejoin',
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
      voiceReasonSummary: 'continuity state',
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
      lipsyncReasonSummary: 'continuity state',
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
      motionReasonSummary: 'continuity state',
      motionSource: 'motion-runtime',
      motionConfidence: 0.9,
      motionSegmentId: 'segment-living-line',
    })

    expect(summary).toContain('Active embodiment lanes: body, face, motion.')
    expect(summary).toContain('Status: partial.')
    expect(summary).toContain('Pending lanes: lipsync, voice.')
    expect(summary.match(/Active embodiment lanes:/gu)).toHaveLength(1)
    expect(summary).not.toContain('embodiment_lanes=body+face+motion')
    expect(summary).not.toContain('body continuity remains present while lipsync and voice rejoin')
    expect(summary).toContain('emotion=thinking')
    expect(summary).toContain('mode=energy-phoneme-hybrid')
    expect(summary).toContain('motion=observe_focus')
    expect(summary).toContain('zh-CN')
    expect(summary).toContain('companion=measured-return')
  })

  it('starts with natural embodiment closure facts without appending raw closure inputs', () => {
    const summary = buildAlicizationEmbodimentLoopSummary({
      authoritySummary: 'embodiment_lanes=body+face+motion | pending_lanes=lipsync+voice',
      currentBodyState: 'body continuity is active',
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

    expect(summary.startsWith(
      'Active embodiment lanes: body, face, motion. | Status: partial. | Pending lanes: lipsync, voice.',
    )).toBe(true)
    expect(summary).not.toContain('continuity state from authority')
    expect(summary).not.toContain('body continuity is active')
  })

  it('keeps inward carry as natural closure evidence while preserving lane reasons', () => {
    const summary = buildAlicizationEmbodimentLoopSummary({
      authoritySummary: 'embodiment_lanes=body+face+motion | pending_lanes=lipsync+voice | evidence=low-pressure-inward-carry',
      currentBodyState: 'continuity state stays inward before widening outward again.',
      language: 'zh-CN',
      companionshipMode: 'measured-return',
      voiceReasonSummary: 'Keep the continuity state inward for now, and leave room before widening outward again',
      lipsyncReasonSummary: 'Keep the continuity state inward for now, and leave room before widening outward again',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })

    expect(summary).toContain('Active embodiment lanes: body, face, motion.')
    expect(summary).toContain('Status: partial.')
    expect(summary).toContain('Pending lanes: lipsync, voice.')
    expect(summary).toContain('Evidence: low-pressure-inward-carry.')
    expect(summary).toContain('reason=Keep the continuity state inward for now, and leave room before widening outward again')
    expect(summary).not.toContain('evidence=low-pressure-inward-carry')
    expect(summary).not.toContain('quiet-companionship')
    expect(summary).not.toContain('continuity state stays inward before widening outward again.')
  })

  it('does not fall back to raw authority text when no structured closure can be derived', () => {
    expect(buildAlicizationEmbodimentLoopSummary({
      authoritySummary: 'legacy=raw',
      currentBodyState: 'body=living',
    })).toBe('')
  })

  it('keeps emotion plus blink and gaze continuity visible on voice and lipsync lanes when body+lipsync carry is still the quieter host-facing living line', () => {
    const summary = buildAlicizationEmbodimentLoopSummary({
      authoritySummary: 'identity-continuity',
      currentBodyState: 'embodiment_lanes=body+lipsync | pending_lanes=face+motion+voice',
      emotion: 'thinking',
      language: 'zh-CN',
      closureBias: 0.35,
      consonantPrecision: 0.55,
      companionshipMode: 'measured-return',
      voiceContinuityTiming: 'body-lipsync-carry',
      voiceReasonSummary: 'Keep the continuity state inward while face, motion, and voice rejoin',
      voiceSegmentId: 'segment-body-lipsync-carry-1',
      mode: 'energy-phoneme-hybrid',
      phase: 'idle',
      continuityHoldMs: 380,
      hintViseme: 'A',
      lipsyncCompanionshipMode: 'measured-return',
      lipsyncContinuityTiming: 'body-lipsync-carry',
      lipsyncReasonSummary: 'Keep the continuity state inward while face, motion, and voice rejoin',
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
      'zh-CN | closure=0.35 | precision=0.55 | emotion=thinking | companion=measured-return | timing=body-lipsync-carry | blink=linger | gaze=soften | pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower | reason=Keep the continuity state inward while face, motion, and voice rejoin | seg=segment-body-lipsync-carry-1',
    )
    expect(summary).toContain(
      'mode=energy-phoneme-hybrid | phase=idle | continuity=sustained-articulation | hold=380ms | hint=A | companion=measured-return | timing=body-lipsync-carry | blink=linger | gaze=soften | pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower | reason=Keep the continuity state inward while face, motion, and voice rejoin | src=prosody-authority | conf=0.91 | seg=segment-body-lipsync-carry-1',
    )
  })
})
