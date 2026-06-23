import { describe, expect, it } from 'vitest'

import { resolveScopedTraceEmbodimentSummary } from './performance-visualizer-trace-embodiment-selection'

describe('performance visualizer trace embodiment selection', () => {
  it('prefers playback cue trace embodiment summary when current cue view already carries the active segment line', () => {
    expect(resolveScopedTraceEmbodimentSummary({
      playbackCueAuthorityView: {
        cueId: 'segment-current',
        authoritySegmentId: 'segment-current',
        traceEmbodimentSummary: 'current playback cue trace',
      } as any,
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-upstream',
          segmentId: 'segment-upstream',
          traceEmbodimentSummary: 'stale upstream trace',
        },
      } as any,
      speechAuthoritySegmentRowsByCueId: {
        'segment-current': {
          traceEmbodimentSummary: 'current row trace',
        } as any,
      },
    })).toBe('current playback cue trace')
  })

  it('keeps same-segment upstream trace embodiment summary when authority summary still belongs to the active playback segment', () => {
    expect(resolveScopedTraceEmbodimentSummary({
      playbackCueAuthorityView: null,
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-current',
          segmentId: 'segment-current',
          traceEmbodimentSummary: 'current upstream trace',
        },
        playbackTelemetry: {
          driverAuthority: {
            segmentId: 'segment-current',
          },
        },
      } as any,
      speechAuthoritySegmentRowsByCueId: {
        'segment-current': {
          traceEmbodimentSummary: 'current row trace',
        } as any,
      },
    })).toBe('current upstream trace')
  })

  it('drops wrong-segment upstream trace embodiment summary and falls back to the current speech row trace', () => {
    expect(resolveScopedTraceEmbodimentSummary({
      playbackCueAuthorityView: null,
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-upstream-other',
          segmentId: 'segment-upstream-other',
          traceEmbodimentSummary: 'stale upstream trace',
        },
        playbackTelemetry: {
          driverAuthority: {
            segmentId: 'segment-current',
          },
          prosodyAuthority: {
            segmentId: 'segment-current',
          },
        },
      } as any,
      speechAuthoritySegmentRowsByCueId: {
        'segment-current': {
          traceEmbodimentSummary: 'current row trace',
        } as any,
      },
    })).toBe('current row trace')
  })

  it('drops stale upstream trace embodiment summary when explicit voice telemetry is the only active authority segment signal', () => {
    expect(resolveScopedTraceEmbodimentSummary({
      playbackCueAuthorityView: null,
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-current',
          segmentId: 'segment-stale',
          traceEmbodimentSummary: 'stale upstream trace',
        },
        playbackTelemetry: {
          drivers: {
            voice: {
              playbackPhase: 'playing',
              continuityHoldMs: 280,
              segmentId: 'segment-current',
              source: 'prosody-authority',
              cueProsodyWeight: 0.29,
            },
          },
        },
      } as any,
      speechAuthoritySegmentRowsByCueId: {
        'segment-current': {
          traceEmbodimentSummary: 'current row trace',
        } as any,
      },
    })).toBe('current row trace')
  })
})
