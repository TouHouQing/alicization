import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationEmbodimentLipSyncPlan,
} from './index'

describe('alicization lip-sync contracts', () => {
  it('preserves authoritative viseme hints with source and confidence metadata', () => {
    const plan = normalizeAlicizationEmbodimentLipSyncPlan({
      mode: 'energy-phoneme-hybrid',
      visemeHints: [{
        segmentId: 'segment-1',
        viseme: 'A',
        weight: 0.75,
        source: 'timeline-projection',
        confidence: 0.88,
      }, {
        segmentId: 'segment-2',
        viseme: 'closed',
        weight: 1,
        source: 'digital-life-projection',
        confidence: 0.42,
      }],
    })

    expect(plan).toEqual({
      mode: 'energy-phoneme-hybrid',
      visemeHints: [{
        segmentId: 'segment-1',
        viseme: 'A',
        weight: 0.75,
        source: 'timeline-projection',
        confidence: 0.88,
      }, {
        segmentId: 'segment-2',
        viseme: 'closed',
        weight: 1,
        source: 'digital-life-projection',
        confidence: 0.42,
      }],
    })
  })

  it('rejects malformed viseme authority metadata instead of weakening the plan', () => {
    expect(normalizeAlicizationEmbodimentLipSyncPlan({
      mode: 'energy-phoneme-hybrid',
      visemeHints: [{
        segmentId: 'segment-1',
        viseme: 'A',
        weight: 0.75,
        source: 'bad-source',
        confidence: 0.88,
      }],
    })).toBeNull()

    expect(normalizeAlicizationEmbodimentLipSyncPlan({
      mode: 'energy-phoneme-hybrid',
      visemeHints: [{
        segmentId: 'segment-1',
        viseme: 'A',
        weight: 0.75,
        source: 'prosody-authority',
        confidence: 'not-a-number',
      }],
    })).toBeNull()
  })
})
