import { describe, expect, it } from 'vitest'

import {
  formatDriverAuthorityBindingSummary,
  formatDriverAuthorityMatchSummary,
  resolveDriverAuthorityAlignment,
  resolveDriverMatchFlagFromSummary,
} from './performance-visualizer-driver-authority'

describe('performance visualizer driver authority helpers', () => {
  it('deduplicates matched sources when formatting authority binding summaries', () => {
    expect(formatDriverAuthorityBindingSummary({
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
      matchedSources: ['prosody-authority', 'timeline-projection', 'prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    })).toBe('target=vrm | drivers=body, face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=body:yes face:yes motion:yes lipsync:yes')
  })

  it('formats match summaries and falls back to cue/segment equality when explicit match state is absent', () => {
    expect(formatDriverAuthorityMatchSummary({
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: null,
    })).toBe('body:yes face:yes motion:no lipsync:n/a')

    expect(resolveDriverAuthorityAlignment(undefined, 'segment-1', 'segment-1')).toBe(true)
    expect(resolveDriverAuthorityAlignment(undefined, 'segment-1', 'segment-2')).toBe(false)
    expect(resolveDriverAuthorityAlignment(null, null, null)).toBeNull()
  })

  it('only parses structured driver flags from authority summaries', () => {
    expect(resolveDriverMatchFlagFromSummary('body:yes face:yes motion:no lipsync:n/a', 'body')).toBe(true)
    expect(resolveDriverMatchFlagFromSummary('body:yes face:yes motion:no lipsync:n/a', 'face')).toBe(true)
    expect(resolveDriverMatchFlagFromSummary('body:yes face:yes motion:no lipsync:n/a', 'motion')).toBe(false)
    expect(resolveDriverMatchFlagFromSummary('上游 authority 命中', 'face')).toBeNull()
  })

  it('emits body-backed lane summaries when body is one of the remaining same-segment carriers', () => {
    expect(formatDriverAuthorityBindingSummary({
      rendererTarget: 'vrm',
      matchedDrivers: ['body'],
      matchedSources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
    })).toBe('target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only')
  })

  it('treats voice as a first-class structured driver lane in authority summaries', () => {
    expect(formatDriverAuthorityMatchSummary({
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    } as any)).toBe('body:yes face:no motion:no lipsync:yes voice:yes')

    expect(formatDriverAuthorityBindingSummary({
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'lipsync', 'voice'],
      matchedSources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    } as any)).toBe('target=vrm | drivers=body, lipsync, voice | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes voice:yes | lane=body+lipsync+voice-only')

    expect(resolveDriverMatchFlagFromSummary('body:yes face:no motion:no lipsync:yes voice:yes', 'voice' as any)).toBe(true)
  })
})
