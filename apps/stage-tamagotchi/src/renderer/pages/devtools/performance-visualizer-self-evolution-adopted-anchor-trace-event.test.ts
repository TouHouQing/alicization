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
        },
        current: {
          recommendedTraceEventId: 'event-person-state',
        },
      },
      selectedSide: 'current',
    })).toEqual({
      eventId: 'event-person-state',
      summaryLine: '当前默认连续性锚点会自动回到事件 event-person-state。',
    })
  })
})
