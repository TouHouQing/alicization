import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchorTraceEventSelection } from './performance-visualizer-self-evolution-adopted-anchor-trace-event'

describe('performance visualizer self evolution adopted anchor trace event selection', () => {
  it('returns null when comparison or selected side is missing', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceEventSelection({
      comparison: null,
      selectedSide: 'current',
    })).toBeNull()

    expect(buildSelfEvolutionAdoptedAnchorTraceEventSelection({
      comparison: {
        previous: {
          recommendedTraceEventId: 'event-takeover',
        },
        current: {
          recommendedTraceEventId: 'event-person-state',
        },
      },
      selectedSide: null,
    })).toBeNull()
  })

  it('selects the recommended trace event for the adopted anchor side', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceEventSelection({
      comparison: {
        previous: {
          recommendedTraceEventId: 'event-takeover',
          rendererRejoinSurfaceKey: null,
        },
        current: {
          recommendedTraceEventId: 'event-person-state',
          rendererRejoinSurfaceKey: null,
        },
        bodyContinuityPhase: null,
      },
      selectedSide: 'current',
    })).toEqual({
      eventId: 'event-person-state',
      summaryLine: '当前默认连续性锚点会自动回到事件 event-person-state。',
    })
  })

  it('keeps renderer rejoin surface visible when the adopted anchor event selection is replaying a body-carried embodiment rejoin', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceEventSelection({
      comparison: {
        previous: {
          recommendedTraceEventId: 'event-body-continuity',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        },
        current: {
          recommendedTraceEventId: 'event-person-state',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        },
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      },
      selectedSide: 'previous',
    })).toEqual({
      eventId: 'event-body-continuity',
      summaryLine: '当前默认连续性锚点会自动回到事件 event-body-continuity，继续核对 VRM 是否沿同一条连续身体线补回显形权威。',
    })
  })

  it('keeps body-only-hold visible when the adopted anchor event selection should continue proving the body line is still carrying the same segment inward', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceEventSelection({
      comparison: {
        previous: {
          recommendedTraceEventId: 'event-body-only-hold',
          rendererRejoinSurfaceKey: null,
        },
        current: {
          recommendedTraceEventId: 'event-person-state',
          rendererRejoinSurfaceKey: null,
        },
        bodyContinuityPhase: 'body-only-hold',
      },
      selectedSide: 'previous',
    })).toEqual({
      eventId: 'event-body-only-hold',
      summaryLine: '当前默认连续性锚点会自动回到事件 event-body-only-hold，继续核对身体线是否仍在独自托住同一段 living segment。',
    })
  })

  it('keeps full-cross-modal-lock visible when the adopted anchor event selection should continue proving the stable lock across body and renderer surfaces', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceEventSelection({
      comparison: {
        previous: {
          recommendedTraceEventId: 'event-full-lock',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        },
        current: {
          recommendedTraceEventId: 'event-person-state',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        },
        bodyContinuityPhase: 'full-cross-modal-lock',
      },
      selectedSide: 'previous',
    })).toEqual({
      eventId: 'event-full-lock',
      summaryLine: '当前默认连续性锚点会自动回到事件 event-full-lock，继续核对身体线与 speech 是否仍稳定锁在同一段 living segment 上。',
    })
  })

  it('keeps renderer-rejoin-without-body visible when the adopted anchor event selection should continue explaining body-loss under visible recovery', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceEventSelection({
      comparison: {
        previous: {
          recommendedTraceEventId: 'event-body-loss',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        },
        current: {
          recommendedTraceEventId: 'event-person-state',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        },
        bodyContinuityPhase: 'renderer-rejoin-without-body',
      },
      selectedSide: 'previous',
    })).toEqual({
      eventId: 'event-body-loss',
      summaryLine: '当前默认连续性锚点会自动回到事件 event-body-loss，继续核对为什么 Live2D 已经回接、但身体线没有继续托住同一段 living segment。',
    })
  })

  it('keeps full-cross-modal-lock visible even when the renderer surface is still unknown to the adopted anchor event selection', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceEventSelection({
      comparison: {
        previous: {
          recommendedTraceEventId: 'event-full-lock-unknown',
          rendererRejoinSurfaceKey: null,
        },
        current: {
          recommendedTraceEventId: 'event-person-state',
          rendererRejoinSurfaceKey: null,
        },
        bodyContinuityPhase: 'full-cross-modal-lock',
      },
      selectedSide: 'previous',
    })).toEqual({
      eventId: 'event-full-lock-unknown',
      summaryLine: '当前默认连续性锚点会自动回到事件 event-full-lock-unknown，继续核对身体线与显形权威是否仍稳定锁在同一段 living segment 上。',
    })
  })

  it('keeps renderer-rejoin-without-body visible even when the renderer surface is still unknown to the adopted anchor event selection', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceEventSelection({
      comparison: {
        previous: {
          recommendedTraceEventId: 'event-body-loss-unknown',
          rendererRejoinSurfaceKey: null,
        },
        current: {
          recommendedTraceEventId: 'event-person-state',
          rendererRejoinSurfaceKey: null,
        },
        bodyContinuityPhase: 'renderer-rejoin-without-body',
      },
      selectedSide: 'previous',
    })).toEqual({
      eventId: 'event-body-loss-unknown',
      summaryLine: '当前默认连续性锚点会自动回到事件 event-body-loss-unknown，继续核对为什么显形权威已经回接、但身体线没有继续托住同一段 living segment。',
    })
  })
})
