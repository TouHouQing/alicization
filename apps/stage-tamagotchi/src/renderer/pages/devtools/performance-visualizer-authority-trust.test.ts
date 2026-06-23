import { describe, expect, it } from 'vitest'

import { deriveAuthorityTrustSummary } from './performance-visualizer-authority-trust'

describe('performance visualizer authority trust summary', () => {
  it('does not invent voice continuity when only lipsync continuity survives without same-segment voice evidence', () => {
    expect(deriveAuthorityTrustSummary({
      prosodyAuthoritySummary: null,
      authoritySegmentId: 'segment-lipsync-only-1',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['lipsync'],
      bodySegmentMatched: null,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    })).toBe('VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。')
  })

  it('keeps voice continuity wording when same-segment prosody authority still supports the current segment', () => {
    expect(deriveAuthorityTrustSummary({
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | provenance=authority-bound | source=prosody-authority | segment=segment-lipsync-voice-1',
      authoritySegmentId: 'segment-lipsync-voice-1',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['lipsync'],
      bodySegmentMatched: null,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    })).toBe('VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。')
  })

  it('keeps body-plus-voice continuity wording when settle authority still marks body and voice as the remaining same-segment carriers', () => {
    expect(deriveAuthorityTrustSummary({
      prosodyAuthoritySummary: null,
      settleAuthoritySummary: 'authority-bound | segment=segment-body-voice-trust-1 | target=vrm | drivers=body | sources=prosody-authority | lane=body+voice-only',
      authoritySegmentId: 'segment-body-voice-trust-1',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['body'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
    })).toBe('VRM 这段 authority 现在主要由身体和声音继续托住，同一段 living segment 还在，只是表情、动作和口型暂时没有一起跟上。')
  })

  it('keeps body-lipsync-voice continuity wording when body and mouth are both still carrying the same segment with voice evidence', () => {
    expect(deriveAuthorityTrustSummary({
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | provenance=authority-bound | source=prosody-authority | segment=segment-body-lipsync-voice-1',
      authoritySegmentId: 'segment-body-lipsync-voice-1',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['body', 'lipsync'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    })).toBe('VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。')
  })
})
