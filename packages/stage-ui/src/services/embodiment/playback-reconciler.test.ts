import { describe, expect, it } from 'vitest'

import type {
  AlicizationDialogueSpeechTimelineSegment,
} from '@proj-alicization/stage-shared'
import type {
  EmbodimentPlaybackDriverTelemetry,
  EmbodimentPlaybackTelemetry,
} from './playback-reconciler'

import {
  cloneEmbodimentPlaybackTelemetry,
  reconcileEmbodimentPlayback,
  resolveEmbodimentPlaybackDriverAuthority,
  resolveEmbodimentPlaybackProsodyAuthority,
} from './playback-reconciler'

function buildCue(overrides: Partial<AlicizationDialogueSpeechTimelineSegment> = {}): AlicizationDialogueSpeechTimelineSegment {
  return {
    id: overrides.id ?? 'segment-clone-hints',
    index: overrides.index ?? 0,
    startOffset: overrides.startOffset ?? 0,
    endOffset: overrides.endOffset ?? 640,
    text: overrides.text ?? '我先沿着这条线轻一点接回来。',
    emotion: overrides.emotion ?? 'thinking',
    gestureWeight: overrides.gestureWeight ?? 0.17,
    facialWeight: overrides.facialWeight ?? 0.27,
    prosodyWeight: overrides.prosodyWeight ?? 0.35,
    beatWeight: overrides.beatWeight ?? 0.24,
    mouthWeight: overrides.mouthWeight ?? 0.28,
    headWeight: overrides.headWeight ?? 0.17,
    personaStyleSummary: overrides.personaStyleSummary ?? 'measured-return',
    facialHoldMs: overrides.facialHoldMs ?? 280,
    actionHoldMs: overrides.actionHoldMs ?? 220,
    emotionHoldMs: overrides.emotionHoldMs ?? 320,
    settleMode: overrides.settleMode ?? 'linger',
    rendererSettle: overrides.rendererSettle ?? null,
    rendererHints: overrides.rendererHints ?? null,
    actionCue: overrides.actionCue ?? 'observe_focus',
    facialCue: overrides.facialCue ?? 'soft-gaze',
    actionWindow: overrides.actionWindow ?? 'segment-start',
    interruptMode: overrides.interruptMode ?? 'soft-interrupt',
  }
}

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
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection'],
        bodySegmentMatched: true,
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
        body: {
          frameMode: 'recovering',
          stillness: 0.78,
          gazeStability: 0.72,
          breathAmplitude: 0.24,
          expressivity: 0.3,
          segmentId: 'segment-vrm-clone',
        },
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
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-vrm-clone', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
      },
    }
    const telemetry = cloneEmbodimentPlaybackTelemetry(source)

    expect(telemetry).toEqual(source)
    expect(telemetry).not.toBe(source)
    expect(telemetry?.drivers).not.toBe(source.drivers)
    expect(telemetry?.drivers.lipsync).not.toBe(source.drivers.lipsync)
  })

  it('preserves cue companionship renderer hints when cloning playback telemetry', () => {
    const source: EmbodimentPlaybackTelemetry = {
      actualDurationMs: 180,
      plannedDurationMs: 180,
      driftMs: 0,
      settleMs: 220,
      stopReason: null,
      rendererTarget: 'vrm',
      cue: buildCue({
        id: 'segment-clone-hints',
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveFocus'],
          reasonTags: ['embodiment:still-voiced-face-line'],
          signature: 'embodiment:audible-same-her-line',
        },
      }),
      driverAuthority: null,
      prosodyAuthority: null,
      drivers: {
        body: null,
        face: null,
        motion: null,
        lipsync: null,
      },
    }

    const telemetry = cloneEmbodimentPlaybackTelemetry(source)

    expect(telemetry?.cue?.rendererHints).toEqual({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveFocus'],
      reasonTags: ['embodiment:still-voiced-face-line'],
      signature: 'embodiment:audible-same-her-line',
    })
    expect(telemetry?.cue?.rendererHints).not.toBe(source.cue?.rendererHints)
  })

  it('preserves same-turn-if-invited measured-return renderer aliases and settle hints without warming the callback line during playback cloning', () => {
    const source: EmbodimentPlaybackTelemetry = {
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 260,
      stopReason: null,
      rendererTarget: 'vrm',
      cue: buildCue({
        id: 'segment-same-turn-invited-measured-return',
        rendererSettle: {
          vrmExpressionBlendMs: 260,
          vrmActionFadeMs: 240,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
          preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
        },
      }),
      driverAuthority: {
        segmentId: 'segment-same-turn-invited-measured-return',
        rendererTarget: 'vrm',
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        sources: ['resident-authority', 'prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        prosodyAuthority: {
          segmentId: 'segment-same-turn-invited-measured-return',
          provenance: 'authority-bound',
          source: 'prosody-authority',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.4,
          cueMouthWeight: 0.3,
          cueHeadWeight: 0.18,
          visemePeakWeight: 0.7,
        },
      },
      prosodyAuthority: {
        segmentId: 'segment-same-turn-invited-measured-return',
        provenance: 'authority-bound',
        source: 'prosody-authority',
        mode: 'energy-phoneme-hybrid',
        cueProsodyWeight: 0.4,
        cueMouthWeight: 0.3,
        cueHeadWeight: 0.18,
        visemePeakWeight: 0.7,
      },
      drivers: {
        body: {
          frameMode: 'thinking',
          stillness: 0.18,
          gazeStability: 0.16,
          breathAmplitude: 0.02,
          expressivity: 0.12,
          segmentId: 'segment-same-turn-invited-measured-return',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.4,
          holdMs: 300,
          source: 'prosody-authority',
          confidence: 0.9,
          preUtteranceCue: null,
          postUtteranceCue: null,
          segmentId: 'segment-same-turn-invited-measured-return',
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.18,
          holdMs: 280,
          source: 'timeline-projection',
          confidence: 0.84,
          segmentId: 'segment-same-turn-invited-measured-return',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          continuityHoldMs: 320,
          visemeHints: [
            { segmentId: 'segment-same-turn-invited-measured-return', viseme: 'I', weight: 0.46, source: 'prosody-authority', confidence: 0.9 },
            { segmentId: 'segment-same-turn-invited-measured-return', viseme: 'closed', weight: 0.7, source: 'prosody-authority', confidence: 0.88 },
          ],
          segmentId: 'segment-same-turn-invited-measured-return',
        },
      },
    }

    const telemetry = cloneEmbodimentPlaybackTelemetry(source)

    expect(telemetry?.cue?.rendererHints).toEqual({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
    })
    expect(telemetry?.cue?.rendererSettle).toEqual({
      vrmExpressionBlendMs: 260,
      vrmActionFadeMs: 240,
    })
    expect(telemetry?.driverAuthority?.segmentId).toBe('segment-same-turn-invited-measured-return')
    expect(telemetry?.driverAuthority?.matchedDrivers).toEqual(['body', 'face', 'motion', 'lipsync'])
    expect(telemetry?.prosodyAuthority?.segmentId).toBe('segment-same-turn-invited-measured-return')
    expect(telemetry?.cue?.rendererHints).not.toBe(source.cue?.rendererHints)
    expect(telemetry?.cue?.rendererSettle).not.toBe(source.cue?.rendererSettle)
  })

  it('deep-clones nested prosody authority and keeps the same authority segment across cue and lipsync lanes', () => {
    const source: EmbodimentPlaybackTelemetry = {
      actualDurationMs: 640,
      plannedDurationMs: 620,
      driftMs: 20,
      settleMs: 220,
      stopReason: 'ended',
      rendererTarget: 'vrm',
      cue: buildCue({
        id: 'segment-same-living-line',
        mouthWeight: 0.35,
        headWeight: 0.32,
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['concerned', 'soft-gaze'],
          preferredMotionAliases: ['Observe', 'Concerned'],
        },
      }),
      driverAuthority: {
        segmentId: 'segment-same-living-line',
        rendererTarget: 'vrm',
        matchedDrivers: ['body', 'lipsync', 'voice'],
        sources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: true,
        prosodyAuthority: {
          segmentId: 'segment-same-living-line',
          provenance: 'authority-bound',
          source: 'prosody-authority',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.35,
          cueMouthWeight: 0.35,
          cueHeadWeight: 0.32,
          visemePeakWeight: 0.75,
        },
      },
      prosodyAuthority: {
        segmentId: 'segment-same-living-line',
        provenance: 'authority-bound',
        source: 'prosody-authority',
        mode: 'energy-phoneme-hybrid',
        cueProsodyWeight: 0.35,
        cueMouthWeight: 0.35,
        cueHeadWeight: 0.32,
        visemePeakWeight: 0.75,
      },
      drivers: {
        body: {
          frameMode: 'thinking',
          stillness: 0.18,
          gazeStability: 0.14,
          breathAmplitude: 0.02,
          expressivity: 0.12,
          segmentId: 'segment-same-living-line',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.4,
          holdMs: 320,
          source: 'digital-life-projection',
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-earlier-shell',
        },
        motion: {
          idleBase: 'observe_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.3,
          holdMs: 220,
          source: 'digital-life-projection',
          confidence: 0.87,
          segmentId: 'segment-earlier-shell',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 320,
          visemeHints: [
            { segmentId: 'segment-same-living-line', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            { segmentId: 'segment-same-living-line', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
      },
    }

    const telemetry = cloneEmbodimentPlaybackTelemetry(source)

    expect(telemetry?.driverAuthority?.segmentId).toBe('segment-same-living-line')
    expect(telemetry?.driverAuthority?.prosodyAuthority).toEqual(source.prosodyAuthority)
    expect(telemetry?.prosodyAuthority?.segmentId).toBe('segment-same-living-line')
    expect(telemetry?.cue?.id).toBe('segment-same-living-line')
    expect(telemetry?.drivers.lipsync?.visemeHints.every(hint => hint.segmentId === 'segment-same-living-line')).toBe(true)
    expect(telemetry).not.toBe(source)
  })

  it('uses authoritative viseme hint segment metadata when lipsync lane segment id is absent', () => {
    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'vrm',
      drivers: {
        body: null,
        face: null,
        motion: null,
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 320,
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
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
  })

  it('prefers the active prosody segment over stale face and motion segments when current speech authority has already advanced', () => {
    const prosodyAuthority = {
      segmentId: 'segment-current-living-line',
      provenance: 'authority-bound' as const,
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid' as const,
      cueProsodyWeight: 0.36,
      cueMouthWeight: 0.28,
      cueHeadWeight: 0.32,
      visemePeakWeight: 0.57,
    }

    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'vrm',
      prosodyAuthority,
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.56,
          holdMs: 360,
          source: 'prosody-authority',
          confidence: 0.94,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-stale-face',
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'inspect_follow',
          intensity: 0.4,
          holdMs: 220,
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-stale-motion',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 300,
          visemeHints: [
            { segmentId: 'segment-current-living-line', viseme: 'I', weight: 0.57, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
      },
    })

    expect(authority).toEqual({
      segmentId: 'segment-current-living-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['lipsync', 'voice'],
      sources: ['prosody-authority'],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      prosodyAuthority,
    })
  })

  it('preserves prosody authority as a visible source when voice is the only surviving same-segment line', () => {
    const prosodyAuthority = {
      segmentId: 'segment-voice-only-living-line',
      provenance: 'authority-bound' as const,
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid' as const,
      cueProsodyWeight: 0.41,
      cueMouthWeight: 0.33,
      cueHeadWeight: 0.26,
      visemePeakWeight: 0.58,
    }

    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'vrm',
      prosodyAuthority,
      drivers: {
        body: null,
        face: null,
        motion: null,
        lipsync: null,
      },
    })

    expect(authority).toEqual({
      segmentId: 'segment-voice-only-living-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['voice'],
      sources: ['prosody-authority'],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: true,
      prosodyAuthority,
    })
  })

  it('does not let a stale explicit segment id override the later living line once prosody and active lipsync have already advanced', () => {
    const prosodyAuthority = {
      segmentId: 'segment-later-living-line',
      provenance: 'authority-bound' as const,
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid' as const,
      cueProsodyWeight: 0.38,
      cueMouthWeight: 0.34,
      cueHeadWeight: 0.29,
      visemePeakWeight: 0.71,
    }

    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'vrm',
      segmentId: 'segment-earlier-shell',
      prosodyAuthority,
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 340,
          source: 'digital-life-projection',
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          segmentId: 'segment-earlier-shell',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.41,
          holdMs: 260,
          source: 'digital-life-projection',
          confidence: 0.87,
          segmentId: 'segment-earlier-shell',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: null,
          continuityHoldMs: 260,
          visemeHints: [
            { segmentId: 'segment-later-living-line', viseme: 'A', weight: 0.46, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-later-living-line', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
          ],
        },
      },
    })

    expect(authority).toEqual({
      segmentId: 'segment-later-living-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['lipsync', 'voice'],
      sources: ['prosody-authority'],
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      prosodyAuthority,
    })
  })

  it('does not let a stale explicit segment id override a later body+lipsync living line before prosody authority catches up', () => {
    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'live2d',
      segmentId: 'segment-earlier-shell',
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.8,
          gazeStability: 0.73,
          breathAmplitude: 0.23,
          expressivity: 0.29,
          segmentId: 'segment-body-lipsync-living-line',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.48,
          holdMs: 300,
          source: 'digital-life-projection',
          confidence: 0.88,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-earlier-shell',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.34,
          holdMs: 220,
          source: 'timeline-projection',
          confidence: 0.86,
          segmentId: 'segment-earlier-shell',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-body-lipsync-living-line',
          continuityHoldMs: 260,
          visemeHints: [
            { segmentId: 'segment-body-lipsync-living-line', viseme: 'I', weight: 0.41, source: 'prosody-authority', confidence: 0.93 },
            { segmentId: 'segment-body-lipsync-living-line', viseme: 'closed', weight: 0.67, source: 'prosody-authority', confidence: 0.9 },
          ],
        },
      },
    })

    expect(authority).toEqual({
      segmentId: 'segment-body-lipsync-living-line',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'lipsync'],
      sources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
  })

  it('does not let a stale explicit segment id override a quieter body+lipsync continuity hold after voice has already settled', () => {
    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'vrm',
      segmentId: 'segment-earlier-shell',
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.84,
          gazeStability: 0.78,
          breathAmplitude: 0.21,
          expressivity: 0.25,
          segmentId: 'segment-quieter-body-lipsync-line',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.46,
          holdMs: 280,
          source: 'digital-life-projection',
          confidence: 0.87,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-earlier-shell',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.31,
          holdMs: 210,
          source: 'timeline-projection',
          confidence: 0.85,
          segmentId: 'segment-earlier-shell',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-quieter-body-lipsync-line',
          continuityHoldMs: 240,
          visemeHints: [
            { segmentId: 'segment-quieter-body-lipsync-line', viseme: 'I', weight: 0.38, source: 'prosody-authority', confidence: 0.9 },
            { segmentId: 'segment-quieter-body-lipsync-line', viseme: 'closed', weight: 0.63, source: 'prosody-authority', confidence: 0.87 },
          ],
        },
      },
    })

    expect(authority).toEqual({
      segmentId: 'segment-quieter-body-lipsync-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'lipsync'],
      sources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: false,
      prosodyAuthority: null,
    })
  })

  it('prefers the later audible-body living line when body prosody and active lipsync already agree while face and motion still point at an older shell', () => {
    const prosodyAuthority = {
      segmentId: 'segment-audible-body-later-line',
      provenance: 'authority-bound' as const,
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid' as const,
      cueProsodyWeight: 0.39,
      cueMouthWeight: 0.36,
      cueHeadWeight: 0.28,
      visemePeakWeight: 0.69,
    }

    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'vrm',
      prosodyAuthority,
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.82,
          gazeStability: 0.74,
          breathAmplitude: 0.22,
          expressivity: 0.28,
          segmentId: 'segment-audible-body-later-line',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.5,
          holdMs: 320,
          source: 'digital-life-projection',
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-stale-face-shell',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.38,
          holdMs: 240,
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-stale-motion-shell',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-audible-body-later-line',
          continuityHoldMs: 280,
          visemeHints: [
            { segmentId: 'segment-audible-body-later-line', viseme: 'I', weight: 0.44, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
      },
    })

    expect(authority).toEqual({
      segmentId: 'segment-audible-body-later-line',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'lipsync', 'voice'],
      sources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      prosodyAuthority,
    })
  })

  it('still prefers the audible-body living line when prosody, body, and lipsync have advanced but only face remains on an older shell', () => {
    const prosodyAuthority = {
      segmentId: 'segment-living-line-now',
      provenance: 'authority-bound' as const,
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid' as const,
      cueProsodyWeight: 0.43,
      cueMouthWeight: 0.39,
      cueHeadWeight: 0.31,
      visemePeakWeight: 0.72,
    }

    const authority = resolveEmbodimentPlaybackDriverAuthority({
      rendererTarget: 'live2d',
      prosodyAuthority,
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.8,
          gazeStability: 0.77,
          breathAmplitude: 0.24,
          expressivity: 0.3,
          segmentId: 'segment-living-line-now',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.48,
          holdMs: 280,
          source: 'digital-life-projection',
          confidence: 0.9,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-face-shell-before-catchup',
        },
        motion: {
          idleBase: 'steady_focus',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.36,
          holdMs: 220,
          source: 'timeline-projection',
          confidence: 0.87,
          segmentId: 'segment-living-line-now',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-living-line-now',
          continuityHoldMs: 260,
          visemeHints: [
            { segmentId: 'segment-living-line-now', viseme: 'I', weight: 0.41, source: 'prosody-authority', confidence: 0.95 },
          ],
        },
      },
    })

    expect(authority).toEqual({
      segmentId: 'segment-living-line-now',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'motion', 'lipsync', 'voice'],
      sources: ['timeline-projection', 'prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      prosodyAuthority,
    })
  })

  it('threads segment-aware prosody authority metadata into driver authority when provenance is authority-bound', () => {
    const drivers: EmbodimentPlaybackDriverTelemetry = {
      body: null,
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
          continuityHoldMs: 220,
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
        ...buildCue({
          id: 'segment-zh-mainline',
          text: '继续看这里。',
          mouthWeight: 0.35,
          headWeight: 0.32,
          startOffset: 0,
          endOffset: 640,
        }),
        rendererHints: null,
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
      matchedDrivers: ['face', 'motion', 'lipsync', 'voice'],
      sources: ['prosody-authority', 'timeline-projection'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
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
