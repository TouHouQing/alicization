import { describe, expect, it } from 'vitest'

import type { EmbodimentPlaybackTelemetry } from './playback-reconciler'

import {
  cloneEmbodimentPlaybackTelemetry,
  reconcileEmbodimentPlayback,
  resolveEmbodimentPlaybackDriverAuthority,
  resolveEmbodimentPlaybackProsodyAuthority,
} from './playback-reconciler'

describe('playback reconciler', () => {
  it('extends settle timing when actual playback exceeds the estimate', () => {
    const result = reconcileEmbodimentPlayback({
      plannedDurationMs: 900,
      actualDurationMs: 1280,
      stopReason: 'ended',
      script: {
        version: 'embodiment-script-v1',
        turnId: 'turn-1',
        rendererTarget: 'live2d',
        replyText: '你好',
        state: {
          baseEmotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
          residentMode: 'dialogue',
        },
        speechPlan: {
          segments: [],
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 180,
        },
        facePlan: { speakingCues: [] },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: { mode: 'energy-only' },
      },
    })

    expect(result.settleMs).toBeGreaterThanOrEqual(180)
    expect(result.driftMs).toBe(380)
    expect(result.rendererTarget).toBe('live2d')
  })

  it('deep-clones renderer-agnostic playback telemetry driver metadata', () => {
    const source: EmbodimentPlaybackTelemetry = {
      actualDurationMs: 180,
      plannedDurationMs: 180,
      driftMs: 0,
      settleMs: 220,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: {
        segmentId: 'segment-vrm-clone',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        prosodyAuthority: null,
      },
      prosodyAuthority: {
        segmentId: 'segment-vrm-clone',
        provenance: 'authority-bound',
        source: 'prosody-authority',
        mode: 'energy-phoneme-hybrid',
        cueProsodyWeight: 0.36,
        cueMouthWeight: 0.28,
        cueHeadWeight: 0.32,
        visemePeakWeight: 0.35,
      },
      drivers: {
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.56,
          holdMs: 360,
          source: 'prosody-authority',
          confidence: 0.94,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-vrm-clone',
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'inspect_follow',
          intensity: 0.4,
          holdMs: 220,
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-vrm-clone',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-vrm-clone',
          visemeHints: [
            { segmentId: 'segment-vrm-clone', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
      },
    }
    const telemetry = cloneEmbodimentPlaybackTelemetry(source)

    expect(telemetry).toEqual({
      actualDurationMs: 180,
      plannedDurationMs: 180,
      driftMs: 0,
      settleMs: 220,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: {
        segmentId: 'segment-vrm-clone',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        prosodyAuthority: null,
      },
      prosodyAuthority: {
        segmentId: 'segment-vrm-clone',
        provenance: 'authority-bound',
        source: 'prosody-authority',
        mode: 'energy-phoneme-hybrid',
        cueProsodyWeight: 0.36,
        cueMouthWeight: 0.28,
        cueHeadWeight: 0.32,
        visemePeakWeight: 0.35,
      },
      cue: null,
      drivers: {
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.56,
          holdMs: 360,
          source: 'prosody-authority',
          confidence: 0.94,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-vrm-clone',
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'inspect_follow',
          intensity: 0.4,
          holdMs: 220,
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-vrm-clone',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-vrm-clone',
          visemeHints: [
            { segmentId: 'segment-vrm-clone', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
      },
    })

    expect(telemetry).not.toBeNull()
    if (!telemetry)
      throw new Error('expected telemetry clone')

    expect(telemetry).not.toBe(source)
    expect(telemetry.drivers).not.toBe(source.drivers)
    expect(telemetry.driverAuthority).not.toBe(source.driverAuthority)
    expect(telemetry.prosodyAuthority).not.toBe(source.prosodyAuthority)
    expect(telemetry.drivers.face).not.toBe(source.drivers.face)
    expect(telemetry.drivers.motion).not.toBe(source.drivers.motion)
    expect(telemetry.drivers.lipsync).not.toBe(source.drivers.lipsync)
    expect(source.drivers.lipsync).not.toBeNull()
    if (!source.drivers.lipsync)
      throw new Error('expected lipsync source')
    expect(telemetry.drivers.lipsync?.visemeHints).not.toBe(source.drivers.lipsync.visemeHints)
  })

  it('uses authoritative viseme hint segment metadata when lipsync lane segment id is absent', () => {
    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'vrm',
      drivers: {
        face: null,
        motion: null,
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          visemeHints: [
            { segmentId: 'segment-viseme-authority', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            { segmentId: 'segment-viseme-authority', viseme: 'closed', weight: 0.61, source: 'prosody-authority', confidence: 0.9 },
          ],
        },
      },
    })

    expect(authority).toEqual({
      segmentId: 'segment-viseme-authority',
      rendererTarget: 'vrm',
      matchedDrivers: ['lipsync'],
      sources: ['prosody-authority'],
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      prosodyAuthority: null,
    })
  })

  it('threads segment-aware prosody authority metadata into driver authority when provenance is authority-bound', () => {
    const drivers = {
      face: {
        emotion: 'thinking',
        facialCue: 'focused',
        intensity: 0.56,
        holdMs: 360,
        source: 'prosody-authority',
        confidence: 0.94,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        segmentId: 'segment-zh-mainline',
      },
      motion: {
        idleBase: 'idle_settle',
        attentionMode: 'attentive',
        actionCue: 'inspect_follow',
        intensity: 0.4,
        holdMs: 220,
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-zh-mainline',
      },
      lipsync: {
        mode: 'energy-phoneme-hybrid' as const,
        playbackPhase: 'playing' as const,
        segmentId: 'segment-zh-mainline',
        visemeHints: [
          { segmentId: 'segment-zh-mainline', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          { segmentId: 'segment-zh-mainline', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
        ],
      },
    }
    const initialAuthority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'vrm',
      drivers,
    })
    const prosodyAuthority = resolveEmbodimentPlaybackProsodyAuthority({
      cue: {
        id: 'segment-zh-mainline',
        text: '继续看这里。',
        prosodyWeight: 0.35,
        mouthWeight: 0.35,
        headWeight: 0.32,
        startMs: 0,
        endMs: 640,
      },
      driverAuthority: initialAuthority,
      drivers,
    })
    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'vrm',
      drivers,
      prosodyAuthority,
    })

    expect(authority).toEqual({
      segmentId: 'segment-zh-mainline',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['prosody-authority', 'timeline-projection'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      prosodyAuthority: {
        segmentId: 'segment-zh-mainline',
        provenance: 'authority-bound',
        source: 'prosody-authority',
        mode: 'energy-phoneme-hybrid',
        cueProsodyWeight: 0.35,
        cueMouthWeight: 0.35,
        cueHeadWeight: 0.32,
        visemePeakWeight: 0.75,
      },
    })
    expect(prosodyAuthority).toEqual({
      segmentId: 'segment-zh-mainline',
      provenance: 'authority-bound',
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid',
      cueProsodyWeight: 0.35,
      cueMouthWeight: 0.35,
      cueHeadWeight: 0.32,
      visemePeakWeight: 0.75,
    })
  })
})
