import { describe, expect, it } from 'vitest'

import {
  formatDriverAuthorityBindingSummary,
  formatDriverAuthorityMatchSummary,
  resolveDriverAuthorityAlignment,
} from './performance-visualizer-driver-authority'

describe('performance visualizer driver authority helpers', () => {
  it('deduplicates matched sources when formatting authority binding summaries', () => {
    expect(formatDriverAuthorityBindingSummary({
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      matchedSources: ['prosody-authority', 'timeline-projection', 'prosody-authority'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    })).toBe('target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes')
  })

  it('formats match summaries and falls back to cue/segment equality when explicit match state is absent', () => {
    expect(formatDriverAuthorityMatchSummary({
      faceSegmentMatched: true,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: null,
    })).toBe('face:yes motion:no lipsync:n/a')

    expect(resolveDriverAuthorityAlignment(undefined, 'segment-1', 'segment-1')).toBe(true)
    expect(resolveDriverAuthorityAlignment(undefined, 'segment-1', 'segment-2')).toBe(false)
    expect(resolveDriverAuthorityAlignment(null, null, null)).toBeNull()
  })
})
