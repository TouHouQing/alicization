import { describe, expect, it } from 'vitest'

import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'

describe('performance visualizer resolve authority trust', () => {
  it('prefers current richer lane trust over stale generic upstream body-line trust when current same-segment evidence now keeps body, lipsync, and voice together', () => {
    expect(resolveAuthorityTrustSummaryWithFallback({
      authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | provenance=authority-bound | source=prosody-authority | segment=segment-body-lipsync-voice-2',
      authoritySegmentId: 'segment-body-lipsync-voice-2',
      rendererTarget: 'vrm',
      authorityMatchedDrivers: ['body', 'lipsync'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    })).toBe('VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。')
  })
})
