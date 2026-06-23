import { describe, expect, it } from 'vitest'

import {
  buildTraceTelemetrySummary,
  resolveTraceSegmentBinding,
} from './performance-visualizer-trace-telemetry'

describe('performance visualizer trace telemetry', () => {
  it('preserves playback-cue body-carried speech rejoin drivers when lane truth is richer than matchedDrivers', () => {
    expect(resolveTraceSegmentBinding({
      cueId: 'segment-playback-body-speech-trace-1',
      playbackCueAuthorityView: {
        authoritySegmentId: 'segment-playback-body-speech-trace-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      } as any,
    })).toEqual({
      matched: true,
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'lipsync'],
      matchedSources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    })
  })

  it('preserves seeded body-carried speech rejoin drivers when lane truth is richer than matchedDrivers', () => {
    expect(resolveTraceSegmentBinding({
      cueId: 'segment-body-speech-trace-1',
      traceContext: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-speech-trace-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
    })).toEqual({
      matched: true,
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'lipsync'],
      matchedSources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    })
  })

  it('threads playback-cue body-carried speech rejoin drivers into trace telemetry summary', () => {
    expect(buildTraceTelemetrySummary({
      cueId: 'segment-playback-body-speech-trace-1',
      playbackCueAuthorityView: {
        authoritySegmentId: 'segment-playback-body-speech-trace-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      } as any,
      traceContext: {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:playback-body-speech-trace:1',
          activeThreadId: 'runtime-thread-playback-body-speech-trace-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'speech-rejoin',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingEvent: {
          kind: 'authority-shift',
          decisionTraceId: 'mind:playback-body-speech-trace:1',
          summary: '当前 playback cue 仍然是身体线先把语音片段接回来。',
          createdAt: 1,
        },
        recentDrivingTraceEvents: [],
      } as any,
    })).toEqual(expect.objectContaining({
      cueId: 'segment-playback-body-speech-trace-1',
      decisionTraceId: 'mind:playback-body-speech-trace:1',
      segmentBinding: {
        matched: true,
        rendererTarget: 'vrm',
        matchedDrivers: ['body', 'lipsync'],
        matchedSources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
    }))
  })

  it('threads seeded body-carried speech rejoin drivers into trace telemetry summary', () => {
    expect(buildTraceTelemetrySummary({
      cueId: 'segment-body-speech-trace-1',
      traceContext: {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:body-speech-trace:1',
          activeThreadId: 'runtime-thread-body-speech-trace-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'speech-rejoin',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingEvent: {
          kind: 'authority-shift',
          decisionTraceId: 'mind:body-speech-trace:1',
          summary: '身体线先把语音片段接回来。',
          createdAt: 1,
        },
        recentDrivingTraceEvents: [],
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-speech-trace-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
    })).toEqual(expect.objectContaining({
      cueId: 'segment-body-speech-trace-1',
      decisionTraceId: 'mind:body-speech-trace:1',
      segmentBinding: {
        matched: true,
        rendererTarget: 'vrm',
        matchedDrivers: ['body', 'lipsync'],
        matchedSources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
    }))
  })
})
