import { describe, expect, it } from 'vitest'

import {
  buildStageEmbodimentCompanionshipReasonSurfaceSummary,
  buildStageEmbodimentContinuitySignatureSurfaceSummary,
  buildStageEmbodimentContinuitySourceSurfaceSummary,
  buildStageEmbodimentDriverSurfaceSummary,
  buildStageEmbodimentLipSyncExecutionSurfaceSummary,
  buildStageEmbodimentLoopSurfaceSummary,
  buildStageEmbodimentMotionExecutionSurfaceSummary,
  buildStageEmbodimentRendererAlignmentSurfaceSummary,
  buildStageEmbodimentRendererLaneFocusSurfaceSummary,
} from './stage-embodiment-diagnostics-overlay-summary'

describe('stage embodiment diagnostics overlay summary', () => {
  it('builds a direct companionship reason surface summary for user-visible diagnostics cards', () => {
    expect(buildStageEmbodimentCompanionshipReasonSurfaceSummary(
      'Memory deliberation still says let repair settle first on the continuity line before closeness widens again',
    )).toBe('reason=Memory deliberation still says let repair settle first on the continuity line before closeness widens again')
  })

  it('does not promote continuity reason tags into diagnostics authority', () => {
    expect(buildStageEmbodimentContinuitySourceSurfaceSummary({
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      signature: 'embodiment:audible-continuity-line',
    })).toBeNull()
  })

  it('does not promote body and voice audit tags into diagnostics authority', () => {
    expect(buildStageEmbodimentContinuitySourceSurfaceSummary({
      reasonTags: ['embodiment:body+voice-only'],
      signature: 'embodiment:audible-continuity-line',
    })).toBeNull()
  })

  it('does not expose renderer audit signatures as diagnostics authority', () => {
    expect(buildStageEmbodimentContinuitySignatureSurfaceSummary(
      'embodiment:audible-continuity-line',
    )).toBeNull()
  })

  it('does not turn signature-only fixed cues into structured runtime lane authority', () => {
    const signatures = [
      'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-line',
      'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line',
      'resident|main-runtime|accompanying|quiet-accompaniment|lipsync+voice-only',
      'resident|main-runtime|accompanying|quiet-accompaniment|body+lipsync-only',
    ]

    for (const signature of signatures) {
      const summary = buildStageEmbodimentRendererAlignmentSurfaceSummary({
        predicted: null,
        actual: null,
        signature,
      })

      expect(summary).toBeNull()
    }
  })

  it('does not turn still-voiced reason cues into structured runtime lane authority without lane evidence', () => {
    const reasonTagSets = [
      [
        'embodiment:still-voiced-face-lipsync-line',
        'embodiment:still-voiced-face-line',
      ],
      [
        'embodiment:still-voiced-motion-lipsync-line',
        'embodiment:still-voiced-motion-line',
      ],
    ]

    for (const reasonTags of reasonTagSets) {
      const summary = buildStageEmbodimentRendererAlignmentSurfaceSummary({
        predicted: null,
        actual: null,
        reasonTags,
      })

      expect(summary).toBeNull()
    }
  })

  it('summarizes active mouth execution proof with dominant viseme, weight, and segment', () => {
    expect(buildStageEmbodimentLipSyncExecutionSurfaceSummary({
      active: true,
      dominantViseme: 'A',
      dominantWeight: 0.58,
      segmentId: 'segment-live2d-mouth-proof-1',
    })).toBe('A@0.58 | executing | segment=segment-live2d-mouth-proof-1')
  })

  it('preserves settling mouth proof without fabricating a numeric weight', () => {
    expect(buildStageEmbodimentLipSyncExecutionSurfaceSummary({
      active: false,
      dominantViseme: 'ih',
      dominantWeight: null,
      segmentId: 'segment-vrm-mouth-proof-1',
    })).toBe('ih | settling | segment=segment-vrm-mouth-proof-1')
  })

  it('returns null when there is no meaningful mouth execution proof', () => {
    expect(buildStageEmbodimentLipSyncExecutionSurfaceSummary(null)).toBeNull()
    expect(buildStageEmbodimentLipSyncExecutionSurfaceSummary({
      active: false,
      dominantViseme: null,
      dominantWeight: null,
      segmentId: null,
    })).toBeNull()
  })

  it('summarizes live motion execution proof with cue identity and segment binding', () => {
    expect(buildStageEmbodimentMotionExecutionSurfaceSummary({
      cue: 'observe_focus',
      segmentId: 'segment-vrm-motion-proof-1',
    })).toBe('observe_focus | segment=segment-vrm-motion-proof-1')
  })

  it('summarizes indexed motion execution proof without fabricating cue text', () => {
    expect(buildStageEmbodimentMotionExecutionSurfaceSummary({
      group: 'idle',
      index: 2,
      segmentId: 'segment-live2d-motion-proof-1',
    })).toBe('idle#2 | segment=segment-live2d-motion-proof-1')
  })

  it('keeps measured-return motion settle context visible on the execution surface', () => {
    expect(buildStageEmbodimentMotionExecutionSurfaceSummary({
      cue: 'steady_focus',
      segmentId: 'segment-live2d-motion-settle-1',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    } as any)).toBe('steady_focus | mode=measured-return | blink=linger | gaze=soften | segment=segment-live2d-motion-settle-1')
  })

  it('keeps repair-before-closeness motion settle context visible on the execution surface', () => {
    expect(buildStageEmbodimentMotionExecutionSurfaceSummary({
      cue: 'steady_focus',
      segmentId: 'segment-live2d-motion-repair-1',
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    } as any)).toBe('steady_focus | mode=repair-before-closeness | blink=linger | gaze=soften | segment=segment-live2d-motion-repair-1')
  })

  it('normalizes vrm settle_idle execution proof into the same canonical idle_settle loop as live2d', () => {
    expect(buildStageEmbodimentMotionExecutionSurfaceSummary({
      cue: 'settle_idle',
      segmentId: 'segment-vrm-settle-loop-1',
      residentMode: 'quiet-companionship',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    } as any)).toBe('idle_settle | mode=quiet-companionship | blink=quiet | gaze=soften | segment=segment-vrm-settle-loop-1')
  })

  it('keeps memory-deliberation repair-first provenance visible in final driver surface summaries', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      face: {
        cue: 'soft-gaze',
        emotion: 'concerned',
        intensity: 0.42,
        holdMs: 460,
        preUtteranceCue: 'soft-breath',
        postUtteranceCue: 'soft-release',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonSummary: 'Memory deliberation still says let repair settle first on the continuity line before closeness widens again',
        source: 'prosody-authority',
        confidence: 0.93,
        segmentId: 'segment-driver-tail-memory-deliberation-repair',
      },
      motion: {
        cue: 'idle_settle',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.24,
        holdMs: 220,
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonSummary: 'Memory deliberation still says let repair settle first on the continuity line before closeness widens again',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-driver-tail-memory-deliberation-repair',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonSummary: 'Memory deliberation still says let repair settle first on the continuity line before closeness widens again',
        source: 'prosody-authority',
        confidence: 0.92,
        segmentId: 'segment-driver-tail-memory-deliberation-repair',
      },
    } as any)).toContain('Memory deliberation still says let repair settle first on the continuity line before closeness widens again')
  })

  it('keeps measured-return vrm motion settle context visible on the execution surface', () => {
    expect(buildStageEmbodimentMotionExecutionSurfaceSummary({
      cue: 'steady_focus',
      segmentId: 'segment-vrm-motion-settle-1',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    } as any)).toBe('steady_focus | mode=measured-return | blink=linger | gaze=soften | segment=segment-vrm-motion-settle-1')
  })

  it('returns null when there is no meaningful motion execution proof', () => {
    expect(buildStageEmbodimentMotionExecutionSurfaceSummary(null)).toBeNull()
    expect(buildStageEmbodimentMotionExecutionSurfaceSummary({
      cue: null,
      group: null,
      index: null,
      segmentId: null,
    })).toBeNull()
  })

  it('surfaces audible-body carry as a dedicated closure stage when only body, lipsync, and voice are back on the living line', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      body: {
        frameMode: 'measured-return',
        stillness: 0.84,
        gazeStability: 0.76,
        breathAmplitude: 0.22,
        expressivity: 0.28,
        segmentId: 'segment-audible-body-carry-1',
      },
      face: null,
      motion: null,
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        source: 'prosody-authority',
        confidence: 0.92,
        segmentId: 'segment-audible-body-carry-1',
      },
      voice: 'zh-CN',
    } as any)

    expect(summary).toContain('closure=audible-body-carry')
  })

  it('surfaces full driver rejoin when body, face, motion, lipsync, and voice have all rejoined the continuity line', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      body: {
        frameMode: 'measured-return',
        stillness: 0.8,
        gazeStability: 0.72,
        breathAmplitude: 0.2,
        expressivity: 0.3,
        segmentId: 'segment-full-driver-rejoin-1',
      },
      face: {
        cue: 'soft-gaze',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 320,
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-full-driver-rejoin-1',
      },
      motion: {
        cue: 'observe_focus',
        intensity: 0.34,
        holdMs: 220,
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-full-driver-rejoin-1',
      },
      lipsync: {
        cue: 'A',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        source: 'prosody-authority',
        confidence: 0.92,
        segmentId: 'segment-full-driver-rejoin-1',
      },
      voice: 'zh-CN',
    } as any)

    expect(summary).toContain('closure=full-driver-rejoin')
  })

  it('surfaces body-only hold when the living line is still only anchored through body', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      body: {
        frameMode: 'measured-return',
        stillness: 0.83,
        gazeStability: 0.74,
        breathAmplitude: 0.21,
        expressivity: 0.26,
        segmentId: 'segment-body-only-hold-1',
      },
      face: null,
      motion: null,
      lipsync: null,
      voice: null,
    } as any)

    expect(summary).toContain('closure=body-only-hold')
  })

  it('surfaces body-carried renderer rejoin when body and voice survive together before lipsync returns', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      body: {
        frameMode: 'repair-before-closeness',
        stillness: 0.88,
        gazeStability: 0.8,
        breathAmplitude: 0.22,
        expressivity: 0.24,
        segmentId: 'segment-body-voice-closure-carry-1',
      },
      face: null,
      motion: null,
      lipsync: null,
      voiceAuthority: {
        cue: null,
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body+voice-only'],
        signature: 'embodiment:audible-continuity-line',
        source: 'prosody-authority',
        confidence: 0.86,
        segmentId: 'segment-body-voice-closure-carry-1',
      },
      voice: 'zh-CN | closure=0.79 | precision=0.86 | companion=repair-before-closeness | blink=quiet | gaze=soften | reason=keep the same cautious line audible while body continuity remains resident',
    } as any)

    expect(summary).toContain('closure=body-carried-to-renderer-rejoin')
    expect(summary).not.toContain('closure=audible-body-carry')
  })

  it('preserves measured-return companionship context in the final driver surface summary', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: {
        cue: 'soft-gaze',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 420,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-driver-tail-measured-return',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.32,
        holdMs: 180,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-driver-tail-measured-return',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-driver-tail-measured-return',
      },
    } as any)).toContain('mode=measured-return')
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: {
        cue: 'soft-gaze',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 420,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-driver-tail-measured-return',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.32,
        holdMs: 180,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-driver-tail-measured-return',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-driver-tail-measured-return',
      },
    } as any)).toContain('blink=linger')
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: {
        cue: 'soft-gaze',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 420,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-driver-tail-measured-return',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.32,
        holdMs: 180,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-driver-tail-measured-return',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-driver-tail-measured-return',
      },
    } as any)).toContain('reason=measure closeness before re-entry so the opening keeps room')
  })

  it('surfaces explicit continuity sources directly inside final driver surface summaries', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: {
        cue: 'soft-gaze',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 420,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        signature: 'embodiment:audible-continuity-line',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-driver-tail-measured-return',
      },
      motion: {
        cue: 'ObserveSoft',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.32,
        holdMs: 180,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        signature: 'embodiment:audible-continuity-line',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-driver-tail-measured-return',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        signature: 'embodiment:audible-continuity-line',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-driver-tail-measured-return',
      },
    } as any)

    expect(summary).not.toContain('continuity=')
    expect(summary).not.toContain('signature=')
  })

  it('surfaces softer ambient-covision attention wording in diagnostics when measured-return motion is still carrying the lower-pressure observe-focus line after release', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: {
        cue: 'soft-gaze',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 420,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-driver-tail-measured-return-post-release',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'observe_focus',
        intensity: 0.26,
        holdMs: 180,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-driver-tail-measured-return-post-release',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'idle',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-driver-tail-measured-return-post-release',
      },
    } as any)).toContain('mode=ambient-covision')
  })

  it('keeps companionship reason visible even when lipsync is the only remaining visible lane', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: null,
      motion: null,
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-lipsync-only-measured-return',
      },
    } as any)).toContain('reason=measure closeness before re-entry so the opening keeps room')
  })

  it('marks lipsync as the only surviving continuity lane when face and motion authority have already thinned away', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: null,
      motion: null,
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'measure closeness before re-entry so the opening keeps room',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-lipsync-only-measured-return',
      },
    } as any)).toContain('embodiment_lanes=lipsync | pending_lanes=body+face+motion+voice')
  })

  it('marks face as the only surviving continuity lane when motion and lipsync have already dropped out', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      face: {
        cue: 'soft-gaze',
        emotion: 'thinking',
        intensity: 0.42,
        holdMs: 380,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'hold the same return line even while other execution lanes go quiet',
        source: 'prosody-authority',
        confidence: 0.92,
        segmentId: 'segment-face-only-measured-return',
      },
      motion: null,
      lipsync: null,
    } as any)).toContain('embodiment_lanes=face | pending_lanes=body+motion+lipsync+voice')
  })

  it('marks motion as the only surviving continuity lane when face and lipsync authority have already thinned away', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: null,
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.28,
        holdMs: 200,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the body on the continuity line while the mouth and face have already settled',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-motion-only-measured-return',
      },
      lipsync: null,
    } as any)).toContain('embodiment_lanes=motion | pending_lanes=body+face+lipsync+voice')
  })

  it('marks the surviving lane combination when one embodiment channel has dropped out during a noisier continuity return', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: {
        cue: 'soft-gaze',
        emotion: 'thinking',
        intensity: 0.44,
        holdMs: 420,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the callback seam gentle even if motion authority thins out first',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-face-lipsync-measured-return',
      },
      motion: null,
      lipsync: {
        cue: 'I',
        mode: 'hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the callback seam gentle even if motion authority thins out first',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-face-lipsync-measured-return',
      },
    } as any)).toContain('embodiment_lanes=face+lipsync | pending_lanes=body+motion+voice')
  })

  it('counts voice as a first-class surviving continuity lane when renderer body lanes have already thinned away', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: null,
      motion: null,
      lipsync: null,
      voice: 'zh-CN | closure=0.84 | precision=0.90 | companion=measured-return | blink=linger | gaze=soften | reason=keep the continuity line audible while body execution thins first',
    } as any)).toContain('embodiment_lanes=voice | pending_lanes=body+face+motion+lipsync')
  })

  it('counts explicit voiceAuthority as a first-class surviving continuity lane even before formatted voice text exists', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      body: null,
      face: null,
      motion: null,
      lipsync: null,
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line audible while formatted voice text catches up',
        reasonTags: ['embodiment:audible-continuity-line'],
        signature: 'embodiment:audible-continuity-line',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-voice-authority-only-lane-1',
      },
      voice: null,
    } as any)

    expect(summary).toContain('embodiment_lanes=voice | pending_lanes=body+face+motion+lipsync')
    expect(summary).not.toContain('continuity=')
    expect(summary).not.toContain('signature=')
    expect(summary).toContain('segment-voice-authority-only-lane-1')
  })

  it('counts body as a first-class surviving continuity lane when face, motion, lipsync, and voice have already thinned away', () => {
    expect(buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      body: {
        frameMode: 'measured-return',
        stillness: 0.84,
        gazeStability: 0.76,
        breathAmplitude: 0.28,
        expressivity: 0.32,
        segmentId: 'segment-body-only-measured-return',
      },
      face: null,
      motion: null,
      lipsync: null,
      voice: null,
    } as any)).toContain('embodiment_lanes=body | pending_lanes=face+motion+lipsync+voice')
  })

  it('counts body and voice together when the resident body line and audible line survive while visible expression lanes thin away', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      body: {
        frameMode: 'repair-before-closeness',
        stillness: 0.88,
        gazeStability: 0.80,
        breathAmplitude: 0.22,
        expressivity: 0.24,
        segmentId: 'segment-body-voice-repair-first',
      },
      face: null,
      motion: null,
      lipsync: null,
      voiceAuthority: {
        cue: null,
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        reasonTags: ['embodiment:body+voice-only'],
        signature: 'embodiment:audible-continuity-line',
        source: 'prosody-authority',
        confidence: 0.86,
        segmentId: 'segment-body-voice-repair-first',
      },
      voice: 'zh-CN | closure=0.79 | precision=0.86 | companion=repair-before-closeness | blink=quiet | gaze=soften | pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower | reason=keep the same cautious line audible while body continuity remains resident',
    } as any)

    expect(summary).toContain('body=repair-before-closeness')
    expect(summary).not.toContain('continuity=')
    expect(summary).not.toContain('signature=')
    expect(summary).toContain('embodiment_lanes=body+voice | pending_lanes=face+motion+lipsync')
    expect(summary).toContain('pause=longer')
    expect(summary).toContain('lipsyncMode=restrained')
    expect(summary).toContain('voiceMode=lower-pressure')
    expect(summary).toContain('pacing=slower')
  })

  it('keeps quieter continuity cadence visible when explicit voiceAuthority is the only host-facing surviving lane before formatted voice text catches up', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      body: null,
      face: null,
      motion: null,
      lipsync: null,
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        reasonSummary: 'keep the continuity line audible while formatted voice text catches up',
        reasonTags: ['embodiment:audible-continuity-line'],
        signature: 'embodiment:audible-continuity-line',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-voice-authority-only-lane-quiet-cadence',
      },
      voice: null,
    } as any)

    expect(summary).toContain('embodiment_lanes=voice | pending_lanes=body+face+motion+lipsync')
    expect(summary).toContain('pause=longer')
    expect(summary).toContain('lipsyncMode=restrained')
    expect(summary).toContain('voiceMode=lower-pressure')
    expect(summary).toContain('pacing=slower')
  })

  it('does not mark lane shrinkage when body, face, motion, lipsync, and voice are all still present on the continuity line', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      body: {
        frameMode: 'measured-return',
        stillness: 0.82,
        gazeStability: 0.74,
        breathAmplitude: 0.26,
        expressivity: 0.34,
        segmentId: 'segment-full-five-lane-return',
      },
      face: {
        cue: 'soft-gaze',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 420,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep every embodiment lane on one living return line',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-full-five-lane-return',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.32,
        holdMs: 180,
        continuityTiming: 'audible-body-carry',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep every embodiment lane on one living return line',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-full-five-lane-return',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        continuityTiming: 'audible-body-carry',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep every embodiment lane on one living return line',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-full-five-lane-return',
      },
      voice: 'zh-CN | closure=0.84 | precision=0.90 | companion=measured-return | timing=audible-body-carry | blink=linger | gaze=soften | reason=keep every embodiment lane on one living return line',
    } as any)

    expect(summary).not.toContain('embodiment_lanes=')
    expect(summary).toContain('timing=audible-body-carry')
  })

  it('keeps repair-before-closeness visible when only lipsync and voice are still carrying the same cautious line', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: null,
      motion: null,
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonSummary: 'hold the same cautious line in voice and mouth before closeness widens again',
        source: 'cue-bridge',
        confidence: 0.93,
        segmentId: 'segment-lipsync-voice-repair-first',
      },
      voice: 'zh-CN | closure=0.81 | precision=0.88 | companion=repair-before-closeness | blink=quiet | gaze=soften | reason=hold the same cautious line in voice and mouth before closeness widens again',
    } as any)

    expect(summary).toContain('companion=repair-before-closeness')
    expect(summary).toContain('reason=hold the same cautious line in voice and mouth before closeness widens again')
    expect(summary).toContain('embodiment_lanes=lipsync+voice | pending_lanes=body+face+motion')
  })

  it('keeps continuity visible when a vrm lipsync tail is the only surviving host-facing line and voice text has already settled away', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      face: null,
      motion: null,
      lipsync: {
        cue: 'I',
        mode: 'restrained',
        playbackPhase: 'idle',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        reasonSummary: 'keep the same cautious line lightly audible while the mouth tail settles',
        reasonTags: ['embodiment:audible-continuity-line'],
        signature: 'embodiment:audible-continuity-line',
        source: 'runtime-execution',
        confidence: null,
        segmentId: 'segment-vrm-tail-continuity-1',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        reasonSummary: 'keep the same cautious line lightly audible while the mouth tail settles',
        reasonTags: ['embodiment:audible-continuity-line'],
        signature: 'embodiment:audible-continuity-line',
        source: 'runtime-execution',
        confidence: null,
        segmentId: 'segment-vrm-tail-continuity-1',
      },
      voice: null,
    } as any)

    expect(summary).toContain('embodiment_lanes=lipsync+voice | pending_lanes=body+face+motion')
    expect(summary).not.toContain('continuity=')
    expect(summary).not.toContain('signature=')
    expect(summary).toContain('segment-vrm-tail-continuity-1')
  })

  it('keeps body+lipsync-only continuity distinct from audible-body carry in driver surface summaries', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      body: {
        frameMode: 'recovering',
        stillness: 0.71,
        gazeStability: 0.68,
        breathAmplitude: 0.2,
        expressivity: 0.24,
        segmentId: 'segment-body-lipsync-carry-1',
      },
      face: null,
      motion: null,
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        continuityTiming: 'body-lipsync-carry',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line inward while face, motion, and voice rejoin',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-body-lipsync-carry-1',
      },
      voice: 'zh-CN | closure=0.35 | precision=0.55 | companion=measured-return | blink=linger | gaze=soften',
    } as any)

    expect(summary).toContain('timing=body-lipsync-carry')
    expect(summary).not.toContain('timing=audible-body-carry')
  })

  it('does not let stale face or motion shells overstate the current host-facing living line when body+lipsync are the only current continuity carry', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      body: {
        frameMode: 'measured-return',
        stillness: 0.84,
        gazeStability: 0.76,
        breathAmplitude: 0.22,
        expressivity: 0.28,
        segmentId: 'segment-quieter-body-lipsync-hold-1',
      },
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.42,
        holdMs: 220,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'return stays slower so closeness can keep room',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-stale-face-shell',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.3,
        holdMs: 220,
        residentMode: 'measured-return',
        continuityTiming: 'audible-body-carry',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'return stays slower so closeness can keep room',
        source: 'timeline-projection',
        confidence: 0.86,
        segmentId: 'segment-stale-motion-shell',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        continuityHoldMs: 420,
        topViseme: 'I:0.34',
        hintTrail: 'I:0.34@0.90 src=prosody-authority segment=segment-quieter-body-lipsync-hold-1',
        hintViseme: 'I',
        continuityTiming: 'body-lipsync-carry',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'return stays slower so closeness can keep room',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-quieter-body-lipsync-hold-1',
      },
      voice: null,
    } as any)

    expect(summary).toContain('embodiment_lanes=body+lipsync | pending_lanes=face+motion+voice')
    expect(summary).toContain('timing=body-lipsync-carry')
    expect(summary).not.toContain('segment-stale-face-shell')
    expect(summary).not.toContain('segment-stale-motion-shell')
    expect(summary).not.toContain('timing=audible-body-carry')
  })

  it('does not let stale face or motion shells overstate the current host-facing living line when lipsync+voice are the only current continuity carry', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'vrm',
      body: null,
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.42,
        holdMs: 220,
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonSummary: 'hold the same cautious line in voice and mouth before closeness widens again',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-stale-face-shell',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.3,
        holdMs: 220,
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonSummary: 'hold the same cautious line in voice and mouth before closeness widens again',
        source: 'timeline-projection',
        confidence: 0.86,
        segmentId: 'segment-stale-motion-shell',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonSummary: 'hold the same cautious line in voice and mouth before closeness widens again',
        source: 'cue-bridge',
        confidence: 0.93,
        segmentId: 'segment-lipsync-voice-repair-first',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        reasonSummary: 'hold the same cautious line in voice and mouth before closeness widens again',
        source: 'cue-bridge',
        confidence: 0.93,
        segmentId: 'segment-lipsync-voice-repair-first',
      },
      voice: 'zh-CN | closure=0.81 | precision=0.88 | companion=repair-before-closeness | blink=quiet | gaze=soften | reason=hold the same cautious line in voice and mouth before closeness widens again | seg=segment-lipsync-voice-repair-first',
    } as any)

    expect(summary).toContain('embodiment_lanes=lipsync+voice | pending_lanes=body+face+motion')
    expect(summary).toContain('companion=repair-before-closeness')
    expect(summary).not.toContain('segment-stale-face-shell')
    expect(summary).not.toContain('segment-stale-motion-shell')
  })

  it('does not let stale motion or lipsync shells overstate the current host-facing living line when face+voice are the only current continuity carry', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      body: null,
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.58,
        holdMs: 300,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice and expression only',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-authority-face-voice-1',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.28,
        holdMs: 220,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice and expression only',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-stale-motion-shell',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice and expression only',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-stale-lipsync-shell',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice and expression only',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-authority-face-voice-1',
      },
      voice: 'zh-CN | closure=0.74 | precision=0.82 | companion=measured-return | blink=linger | gaze=soften | reason=keep the continuity line visible in voice and expression only | seg=segment-authority-face-voice-1',
    } as any)

    expect(summary).toContain('embodiment_lanes=face+voice | pending_lanes=body+motion+lipsync')
    expect(summary).not.toContain('segment-stale-motion-shell')
    expect(summary).not.toContain('segment-stale-lipsync-shell')
  })

  it('does not let stale face or lipsync shells overstate the current host-facing living line when motion+voice are the only current continuity carry', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      body: null,
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.42,
        holdMs: 220,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice and motion only',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-stale-face-shell',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.46,
        holdMs: 260,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice and motion only',
        source: 'prosody-authority',
        confidence: 0.88,
        segmentId: 'segment-authority-motion-voice-1',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice and motion only',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-stale-lipsync-shell',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice and motion only',
        source: 'prosody-authority',
        confidence: 0.88,
        segmentId: 'segment-authority-motion-voice-1',
      },
      voice: 'zh-CN | closure=0.71 | precision=0.80 | companion=measured-return | blink=linger | gaze=soften | reason=keep the continuity line visible in voice and motion only | seg=segment-authority-motion-voice-1',
    } as any)

    expect(summary).toContain('embodiment_lanes=motion+voice | pending_lanes=body+face+lipsync')
    expect(summary).not.toContain('segment-stale-face-shell')
    expect(summary).not.toContain('segment-stale-lipsync-shell')
  })

  it('does not let a stale voice-authority shell erase the current face+lipsync+voice host-facing living line', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      body: null,
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.58,
        holdMs: 300,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice expression and mouth only',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-current-face-mouth-voice',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.28,
        holdMs: 220,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice expression and mouth only',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-stale-motion-shell',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice expression and mouth only',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-current-face-mouth-voice',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice expression and mouth only',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-stale-voice-authority-shell',
      },
      voice: 'zh-CN | closure=0.74 | precision=0.82 | companion=measured-return | blink=linger | gaze=soften | reason=keep the continuity line visible in voice expression and mouth only | seg=segment-current-face-mouth-voice',
    } as any)

    expect(summary).toContain('embodiment_lanes=face+lipsync+voice | pending_lanes=body+motion')
    expect(summary).toContain('zh-CN | closure=0.74 | precision=0.82')
    expect(summary).toContain('seg=segment-current-face-mouth-voice')
    expect(summary).not.toContain('segment-stale-motion-shell')
    expect(summary).not.toContain('segment-stale-voice-authority-shell')
  })

  it('does not let a stale voice-authority shell erase the current motion+lipsync+voice host-facing living line', () => {
    const summary = buildStageEmbodimentDriverSurfaceSummary({
      rendererTarget: 'live2d',
      body: null,
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.42,
        holdMs: 220,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice motion and mouth only',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-stale-face-shell',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.46,
        holdMs: 260,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice motion and mouth only',
        source: 'prosody-authority',
        confidence: 0.88,
        segmentId: 'segment-current-motion-mouth-voice',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice motion and mouth only',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-current-motion-mouth-voice',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice motion and mouth only',
        source: 'prosody-authority',
        confidence: 0.88,
        segmentId: 'segment-stale-voice-authority-shell',
      },
      voice: 'zh-CN | closure=0.71 | precision=0.80 | companion=measured-return | blink=linger | gaze=soften | reason=keep the continuity line visible in voice motion and mouth only | seg=segment-current-motion-mouth-voice',
    } as any)

    expect(summary).toContain('embodiment_lanes=motion+lipsync+voice | pending_lanes=body+face')
    expect(summary).toContain('zh-CN | closure=0.71 | precision=0.80')
    expect(summary).toContain('seg=segment-current-motion-mouth-voice')
    expect(summary).not.toContain('segment-stale-face-shell')
    expect(summary).not.toContain('segment-stale-voice-authority-shell')
  })

  it('keeps later-line same-segment recovery visible on the renderer alignment surface summary', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Focus Inspect',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'alias-resolution-drift',
      reason: 'preferred',
      faceDriverCue: 'focused',
      faceDriverSource: 'cue-bridge',
      faceDriverSegmentId: 'segment-live2d-later-living-line',
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-later-living-line',
    } as any)).toBe(
      'Soft Gaze -> Focus Inspect | mode=measured-return | blink=linger | gaze=soften | drifted | alias-resolution-drift | preferred | face=focused@cue-bridge seg=segment-live2d-later-living-line | motion=observe_focus@timeline-projection seg=segment-live2d-later-living-line | embodiment_lanes=face+motion | pending_lanes=body+lipsync+voice | evidence=runtime-lane-authority',
    )
  })

  it('keeps body-aware same-segment recovery visible on the renderer alignment surface summary when the resident body line has already re-formed on that segment', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Focus Inspect',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'alias-resolution-drift',
      reason: 'preferred',
      faceDriverCue: 'focused',
      faceDriverSource: 'cue-bridge',
      faceDriverSegmentId: 'segment-live2d-reformed-with-body',
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-reformed-with-body',
      bodyDriverSegmentId: 'segment-live2d-reformed-with-body',
    } as any)).toBe(
      'Soft Gaze -> Focus Inspect | mode=measured-return | blink=linger | gaze=soften | drifted | alias-resolution-drift | preferred | face=focused@cue-bridge seg=segment-live2d-reformed-with-body | motion=observe_focus@timeline-projection seg=segment-live2d-reformed-with-body | embodiment_lanes=body+face+motion | pending_lanes=lipsync+voice | evidence=runtime-lane-authority | pending_lanes=lipsync+voice',
    )
  })

  it('keeps continuity inward carry visible in the embodiment loop surface summary when body face and motion already hold one living segment', () => {
    const summary = buildStageEmbodimentLoopSurfaceSummary({
      rendererTarget: 'live2d',
      body: {
        frameMode: 'measured-return',
        stillness: 0.82,
        gazeStability: 0.74,
        breathAmplitude: 0.26,
        expressivity: 0.34,
        segmentId: 'segment-live2d-inward-carry',
      },
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 420,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'continuity_hold=measured_return; direction=inward; widening=deferred; pressure=lower',
        source: 'cue-bridge',
        confidence: 0.94,
        segmentId: 'segment-live2d-inward-carry',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.32,
        holdMs: 180,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'continuity_hold=measured_return; direction=inward; widening=deferred; pressure=lower',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-live2d-inward-carry',
      },
      lipsync: null,
      voice: null,
    } as any)

    expect(summary).toContain('Active embodiment lanes: body, face, motion.')
    expect(summary).toContain('Pending lanes: lipsync, voice.')
    expect(summary).toContain('reason=continuity_hold=measured_return; direction=inward; widening=deferred; pressure=lower')
    expect(summary).toContain('Evidence: runtime-lane-authority.')
    expect(summary).not.toContain('recovery@')
    expect(summary).not.toContain('remaining-open=')
  })

  it('does not keep voice marked as still-open in the loop summary once explicit voiceAuthority has already rejoined the same inward living line', () => {
    const summary = buildStageEmbodimentLoopSurfaceSummary({
      rendererTarget: 'live2d',
      body: {
        frameMode: 'settle',
        stillness: 0.74,
        gazeStability: 0.7,
        breathAmplitude: 0.18,
        expressivity: 0.22,
        segmentId: 'segment-live2d-inward-carry-voice-authority',
      },
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.4,
        holdMs: 240,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'continuity_hold=measured_return; direction=inward; widening=deferred; pressure=lower',
        source: 'cue-bridge',
        confidence: 0.92,
        segmentId: 'segment-live2d-inward-carry-voice-authority',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.32,
        holdMs: 180,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'Keep the continuity line inward for now, and leave room before widening outward again',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-live2d-inward-carry-voice-authority',
      },
      lipsync: null,
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'continuity_hold=measured_return; direction=inward; voice=rejoined; rejoin=lipsync',
        reasonTags: ['embodiment:audible-continuity-line'],
        signature: 'embodiment:audible-continuity-line',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-live2d-inward-carry-voice-authority',
      },
      voice: null,
    } as any)

    expect(summary).toContain('Active embodiment lanes: body, face, motion, voice.')
    expect(summary).toContain('Pending lanes: lipsync.')
    expect(summary).not.toContain('Evidence: runtime-lane-authority.')
    expect(summary).not.toContain('remaining-open=')
  })

  it('rebuilds thin voice lane continuity from the current body+lipsync living line instead of leaving host-facing loop summaries with a thinner voiced shell', () => {
    const summary = buildStageEmbodimentLoopSurfaceSummary({
      rendererTarget: 'vrm',
      body: {
        frameMode: 'recovering',
        stillness: 0.71,
        gazeStability: 0.68,
        breathAmplitude: 0.2,
        expressivity: 0.24,
        segmentId: 'segment-body-lipsync-carry-loop-1',
      },
      face: null,
      motion: null,
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        continuityTiming: 'body-lipsync-carry',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'continuity_hold=body_lipsync_carry; direction=inward; rejoin=face+motion+voice',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-body-lipsync-carry-loop-1',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body+lipsync-only'],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|body+lipsync-only',
        reasonSummary: 'continuity_hold=body_lipsync_carry; direction=inward; rejoin=face+motion+voice',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-body-lipsync-carry-loop-1',
      },
      voice: 'zh-CN | closure=0.35 | precision=0.55',
    } as any)

    expect(summary).toContain(
      'zh-CN | closure=0.35 | precision=0.55 | companion=measured-return | timing=body-lipsync-carry | blink=linger | gaze=soften | reason=continuity_hold=body_lipsync_carry; direction=inward; rejoin=face+motion+voice | src=prosody-authority | seg=segment-body-lipsync-carry-loop-1',
    )
    expect(summary).not.toContain('timing=audible-body-carry')
  })

  it('keeps the host-facing lipsync lane tied to real current carry evidence instead of inventing viseme hints or hold windows from mode names', () => {
    const summary = buildStageEmbodimentLoopSurfaceSummary({
      rendererTarget: 'vrm',
      body: {
        frameMode: 'recovering',
        stillness: 0.71,
        gazeStability: 0.68,
        breathAmplitude: 0.2,
        expressivity: 0.24,
        segmentId: 'segment-body-lipsync-carry-loop-1',
      },
      face: null,
      motion: null,
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        continuityTiming: 'body-lipsync-carry',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'continuity_hold=body_lipsync_carry; direction=inward; rejoin=face+motion+voice',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-body-lipsync-carry-loop-1',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:body+lipsync-only'],
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|body+lipsync-only',
        reasonSummary: 'continuity_hold=body_lipsync_carry; direction=inward; rejoin=face+motion+voice',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-body-lipsync-carry-loop-1',
      },
      voice: 'zh-CN | closure=0.35 | precision=0.55',
    } as any)

    expect(summary).toContain(
      'mode=energy-phoneme-hybrid | phase=playing | companion=measured-return | timing=body-lipsync-carry | blink=linger | gaze=soften | reason=continuity_hold=body_lipsync_carry; direction=inward; rejoin=face+motion+voice | src=prosody-authority | conf=0.91 | seg=segment-body-lipsync-carry-loop-1',
    )
    expect(summary).not.toContain('topViseme=energy-phoneme-hybrid')
    expect(summary).not.toContain('hints=energy-phoneme-hybrid')
    expect(summary).not.toContain('hint=energy-phoneme-hybrid')
    expect(summary).not.toContain('hold=360ms')
  })

  it('keeps the current parsed voice carry visible in the loop summary when face+lipsync+voice survive but voice-authority is stale', () => {
    const summary = buildStageEmbodimentLoopSurfaceSummary({
      rendererTarget: 'live2d',
      body: null,
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.58,
        holdMs: 300,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice expression and mouth only',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-current-face-mouth-voice',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.28,
        holdMs: 220,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice expression and mouth only',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-stale-motion-shell',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice expression and mouth only',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-current-face-mouth-voice',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice expression and mouth only',
        source: 'prosody-authority',
        confidence: 0.91,
        segmentId: 'segment-stale-voice-authority-shell',
      },
      voice: 'zh-CN | closure=0.74 | precision=0.82 | companion=measured-return | blink=linger | gaze=soften | reason=keep the continuity line visible in voice expression and mouth only | seg=segment-current-face-mouth-voice',
    } as any)

    expect(summary).toContain('Active embodiment lanes: face, lipsync, voice.')
    expect(summary).toContain('Pending lanes: body, motion.')
    expect(summary).toContain('zh-CN | closure=0.74 | precision=0.82')
    expect(summary).toContain('seg=segment-current-face-mouth-voice')
    expect(summary).not.toContain('segment-stale-motion-shell')
    expect(summary).not.toContain('segment-stale-voice-authority-shell')
  })

  it('keeps the current parsed voice carry visible in the loop summary when motion+lipsync+voice survive but voice-authority is stale', () => {
    const summary = buildStageEmbodimentLoopSurfaceSummary({
      rendererTarget: 'live2d',
      body: null,
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.42,
        holdMs: 220,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice motion and mouth only',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-stale-face-shell',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.46,
        holdMs: 260,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice motion and mouth only',
        source: 'prosody-authority',
        confidence: 0.88,
        segmentId: 'segment-current-motion-mouth-voice',
      },
      lipsync: {
        cue: 'I',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice motion and mouth only',
        source: 'prosody-authority',
        confidence: 0.9,
        segmentId: 'segment-current-motion-mouth-voice',
      },
      voiceAuthority: {
        cue: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonSummary: 'keep the continuity line visible in voice motion and mouth only',
        source: 'prosody-authority',
        confidence: 0.88,
        segmentId: 'segment-stale-voice-authority-shell',
      },
      voice: 'zh-CN | closure=0.71 | precision=0.80 | companion=measured-return | blink=linger | gaze=soften | reason=keep the continuity line visible in voice motion and mouth only | seg=segment-current-motion-mouth-voice',
    } as any)

    expect(summary).toContain('Active embodiment lanes: motion, lipsync, voice.')
    expect(summary).toContain('Pending lanes: body, face.')
    expect(summary).toContain('zh-CN | closure=0.71 | precision=0.80')
    expect(summary).toContain('seg=segment-current-motion-mouth-voice')
    expect(summary).not.toContain('segment-stale-face-shell')
    expect(summary).not.toContain('segment-stale-voice-authority-shell')
  })

  it('keeps richer body-aware partial-recovery prose legible on the renderer alignment surface alongside the canonical recovery token', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Focus Inspect',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'alias-resolution-drift',
      reason: 'body, face, and motion authority have already re-formed on the same segment.',
      faceDriverCue: 'focused',
      faceDriverSource: 'cue-bridge',
      faceDriverSegmentId: 'segment-live2d-reformed-with-body-prose',
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-reformed-with-body-prose',
      bodyDriverSegmentId: 'segment-live2d-reformed-with-body-prose',
    } as any)).toBe(
      'Soft Gaze -> Focus Inspect | mode=measured-return | blink=linger | gaze=soften | drifted | alias-resolution-drift | body, face, and motion authority have already re-formed on the same segment. | face=focused@cue-bridge seg=segment-live2d-reformed-with-body-prose | motion=observe_focus@timeline-projection seg=segment-live2d-reformed-with-body-prose | embodiment_lanes=body+face+motion | pending_lanes=lipsync+voice | evidence=runtime-lane-authority | pending_lanes=lipsync+voice',
    )
  })

  it('keeps body-only recovery visible on the renderer alignment surface summary when body continuity reforms before face and motion return', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-body-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: 'segment-live2d-body-first-return',
    } as any)).toBe(
      'Soft Gaze -> Resident Hold | mode=measured-return | blink=linger | gaze=soften | drifted | runtime-only-visible | resident-body-first | embodiment_lanes=body | pending_lanes=face+motion+lipsync+voice | evidence=runtime-lane-authority | partial=face+motion+lipsync+voice',
    )
  })

  it('keeps body+voice recovery visible on the renderer alignment surface summary when the resident body line and audible line re-form together before face and motion return', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-body-voice-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: 'segment-live2d-body-voice-first-return',
      voiceDriverSegmentId: 'segment-live2d-body-voice-first-return',
    } as any)).toBe(
      'Soft Gaze -> Resident Hold | mode=measured-return | blink=linger | gaze=soften | drifted | runtime-only-visible | resident-body-voice-first | embodiment_lanes=body+voice | pending_lanes=face+motion+lipsync | evidence=runtime-lane-authority | partial=face+motion+lipsync',
    )
  })

  it('keeps body+lipsync+voice recovery visible on the renderer alignment surface summary when the audible-body line re-forms before face and motion return', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      signature: 'embodiment:audible-continuity-line',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-audible-body-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: 'segment-live2d-audible-body-first-return',
      lipsyncDriverSegmentId: 'segment-live2d-audible-body-first-return',
      voiceDriverSegmentId: 'segment-live2d-audible-body-first-return',
    } as any)).toBe(
      'Soft Gaze -> Resident Hold | mode=measured-return | blink=linger | gaze=soften | drifted | runtime-only-visible | resident-audible-body-first | embodiment_lanes=body+lipsync+voice | pending_lanes=face+motion | evidence=runtime-lane-authority | audible-body rejoin@segment-live2d-audible-body-first-return | partial=face+motion',
    )
  })

  it('builds a renderer lane focus summary when the audible-body continuity line is already alive but face and motion are still lagging', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      signature: 'embodiment:audible-continuity-line',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-audible-body-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: 'segment-live2d-audible-body-first-return',
      lipsyncDriverSegmentId: 'segment-live2d-audible-body-first-return',
      voiceDriverSegmentId: 'segment-live2d-audible-body-first-return',
    } as any)).toBe('Focus: body+lipsync+voice. Pending: face+motion.')
  })

  it('builds a renderer lane focus summary when the resident body line is the only surviving continuity carry', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-body-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: 'segment-live2d-body-first-return',
    } as any)).toBe('Focus: resident-body. Pending: face+motion+lipsync+voice.')
  })

  it('builds a renderer lane focus summary when body face and motion have already rejoined but lipsync and voice remain open', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Focus Inspect',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'alias-resolution-drift',
      reason: 'preferred',
      faceDriverCue: 'focused',
      faceDriverSource: 'cue-bridge',
      faceDriverSegmentId: 'segment-live2d-reformed-with-body',
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-reformed-with-body',
      bodyDriverSegmentId: 'segment-live2d-reformed-with-body',
    } as any)).toBe('Focus: body+face+motion. Pending: lipsync+voice.')
  })

  it('builds a renderer lane focus summary when only lipsync and voice have re-formed the audible continuity line', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-audible-voice-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: 'segment-live2d-audible-voice-first-return',
      voiceDriverSegmentId: 'segment-live2d-audible-voice-first-return',
    } as any)).toBe('Focus: lipsync+voice. Pending: body+face+motion.')
  })

  it('builds a renderer lane focus summary when face and voice share runtime lane authority', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-still-voiced-face-first',
      faceDriverCue: 'soft-gaze',
      faceDriverSource: 'prosody-authority',
      faceDriverSegmentId: 'segment-live2d-still-voiced-face-return',
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: null,
      voiceDriverSegmentId: 'segment-live2d-still-voiced-face-return',
    } as any)).toBe('Focus: face+voice. Pending: body+motion+lipsync.')
  })

  it('builds a renderer lane focus summary when motion and voice share runtime lane authority', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-still-voiced-motion-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-still-voiced-motion-return',
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: null,
      voiceDriverSegmentId: 'segment-live2d-still-voiced-motion-return',
    } as any)).toBe('Focus: motion+voice. Pending: body+face+lipsync.')
  })

  it('builds a renderer lane focus summary when face and lipsync are the surviving quieter visible continuity carry before body motion and voice rejoin', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-visible-face-mouth-first',
      faceDriverCue: 'soft-gaze',
      faceDriverSource: 'prosody-authority',
      faceDriverSegmentId: 'segment-live2d-visible-face-mouth-return',
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: 'segment-live2d-visible-face-mouth-return',
      voiceDriverSegmentId: null,
    } as any)).toBe('Focus: face+lipsync. Pending: body+motion+voice.')
  })

  it('builds a renderer lane focus summary when motion and lipsync are the surviving quieter visible continuity carry before body face and voice rejoin', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-visible-motion-mouth-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-visible-motion-mouth-return',
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: 'segment-live2d-visible-motion-mouth-return',
      voiceDriverSegmentId: null,
    } as any)).toBe('Focus: motion+lipsync. Pending: body+face+voice.')
  })

  it('builds a renderer lane focus summary when face lipsync and voice share runtime lane authority', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-still-voiced-face-mouth-first',
      faceDriverCue: 'soft-gaze',
      faceDriverSource: 'prosody-authority',
      faceDriverSegmentId: 'segment-live2d-still-voiced-face-mouth-return',
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: 'segment-live2d-still-voiced-face-mouth-return',
      voiceDriverSegmentId: 'segment-live2d-still-voiced-face-mouth-return',
    } as any)).toBe('Focus: face+lipsync+voice. Pending: body+motion.')
  })

  it('builds a renderer lane focus summary when motion lipsync and voice share runtime lane authority', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-still-voiced-motion-mouth-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-still-voiced-motion-mouth-return',
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: 'segment-live2d-still-voiced-motion-mouth-return',
      voiceDriverSegmentId: 'segment-live2d-still-voiced-motion-mouth-return',
    } as any)).toBe('Focus: motion+lipsync+voice. Pending: body+face.')
  })

  it('builds a renderer lane focus summary when face motion and voice share runtime lane authority', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-still-voiced-face-motion-first',
      faceDriverCue: 'soft-gaze',
      faceDriverSource: 'prosody-authority',
      faceDriverSegmentId: 'segment-live2d-still-voiced-face-motion-return',
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-still-voiced-face-motion-return',
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: null,
      voiceDriverSegmentId: 'segment-live2d-still-voiced-face-motion-return',
    } as any)).toBe('Focus: face+motion+voice. Pending: body+lipsync.')
  })

  it('builds a renderer lane focus summary when face motion lipsync and voice have visibly rejoined before body returns', () => {
    expect(buildStageEmbodimentRendererLaneFocusSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-visible-rejoin-no-body',
      faceDriverCue: 'soft-gaze',
      faceDriverSource: 'prosody-authority',
      faceDriverSegmentId: 'segment-live2d-visible-rejoin-no-body-1',
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-visible-rejoin-no-body-1',
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: 'segment-live2d-visible-rejoin-no-body-1',
      voiceDriverSegmentId: 'segment-live2d-visible-rejoin-no-body-1',
    } as any)).toBe('Focus: face+motion+lipsync+voice. Pending: body.')
  })

  it('keeps lipsync+voice recovery visible on the renderer alignment surface summary when the audible continuity line re-forms before body face and motion return', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-audible-voice-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: 'segment-live2d-audible-voice-first-return',
      voiceDriverSegmentId: 'segment-live2d-audible-voice-first-return',
    } as any)).toBe(
      'Soft Gaze -> Resident Hold | mode=measured-return | blink=linger | gaze=soften | drifted | runtime-only-visible | resident-audible-voice-first | embodiment_lanes=lipsync+voice | pending_lanes=body+face+motion | evidence=runtime-lane-authority | partial=body+face+motion',
    )
  })

  it('keeps face-motion-voice pending rejoin visible when body and lipsync have already fallen away from the living voice line', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-audible-voice-first',
      faceDriverCue: null,
      faceDriverSource: null,
      faceDriverSegmentId: null,
      motionDriverCue: null,
      motionDriverSource: null,
      motionDriverSegmentId: null,
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: null,
      voiceDriverSegmentId: 'segment-live2d-audible-voice-first-return',
    } as any)).toBe(
      'Soft Gaze -> Resident Hold | mode=measured-return | blink=linger | gaze=soften | drifted | runtime-only-visible | resident-audible-voice-first | partial=face+motion+voice',
    )
  })

  it('keeps structured face-and-motion runtime lane authority explicit before body and lipsync return', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-still-voiced-face-motion-first',
      faceDriverCue: 'soft-gaze',
      faceDriverSource: 'prosody-authority',
      faceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-motion-1',
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-motion-1',
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: null,
      voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-motion-1',
    } as any)).toBe(
      'Soft Gaze -> Resident Hold | mode=measured-return | blink=linger | gaze=soften | drifted | runtime-only-visible | resident-still-voiced-face-motion-first | face=soft-gaze@prosody-authority seg=segment-live2d-runtime-still-voiced-face-motion-1 | motion=observe_focus@timeline-projection seg=segment-live2d-runtime-still-voiced-face-motion-1 | embodiment_lanes=face+motion | pending_lanes=body+lipsync+voice | evidence=runtime-lane-authority | partial=body+lipsync',
    )
  })

  it('keeps four-lane visible recovery explicit on the renderer alignment surface summary when body still has not rejoined', () => {
    expect(buildStageEmbodimentRendererAlignmentSurfaceSummary({
      predicted: 'Soft Gaze',
      actual: 'Resident Hold',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      status: 'drifted',
      driftKind: 'runtime-only-visible',
      reason: 'resident-visible-rejoin-no-body',
      faceDriverCue: 'soft-gaze',
      faceDriverSource: 'prosody-authority',
      faceDriverSegmentId: 'segment-live2d-visible-rejoin-no-body-1',
      motionDriverCue: 'observe_focus',
      motionDriverSource: 'timeline-projection',
      motionDriverSegmentId: 'segment-live2d-visible-rejoin-no-body-1',
      bodyDriverSegmentId: null,
      lipsyncDriverSegmentId: 'segment-live2d-visible-rejoin-no-body-1',
      voiceDriverSegmentId: 'segment-live2d-visible-rejoin-no-body-1',
    } as any)).toBe(
      'Soft Gaze -> Resident Hold | mode=measured-return | blink=linger | gaze=soften | drifted | runtime-only-visible | resident-visible-rejoin-no-body | face=soft-gaze@prosody-authority seg=segment-live2d-visible-rejoin-no-body-1 | motion=observe_focus@timeline-projection seg=segment-live2d-visible-rejoin-no-body-1 | embodiment_lanes=face+motion+lipsync+voice | pending_lanes=body | evidence=runtime-lane-authority | partial=body',
    )
  })
})
