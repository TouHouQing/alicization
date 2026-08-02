import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatternContext } from './performance-visualizer-self-evolution-focus-history-pattern-context'

function pattern(overrides: Record<string, unknown> = {}) {
  return {
    patternKey: 'pattern-1',
    occurrenceCount: 1,
    summaryLine: '历史模式',
    focusCardTransition: 'repair-path -> repair-owner',
    traceEventTransition: 'event-takeover -> event-person-state',
    evidenceGained: [],
    evidenceLost: [],
    traceTargetsGained: [],
    traceTargetsLost: [],
    occurrences: [{ currentCapturedAt: 400, previousCapturedAt: 300 }],
    ...overrides,
  }
}

describe('performance visualizer self evolution focus history pattern context', () => {
  it('returns null when the pattern has no recorded occurrences', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: pattern({ occurrences: [] }) as any,
      preferredSide: 'current',
    })).toBeNull()
  })

  it('selects the latest occurrence current side', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: pattern({
        occurrences: [
          { currentCapturedAt: 400, previousCapturedAt: 300 },
          { currentCapturedAt: 200, previousCapturedAt: 100 },
        ],
      }) as any,
      preferredSide: 'current',
    })).toEqual({
      currentCapturedAt: 400,
      previousCapturedAt: 300,
      side: 'current',
      summaryLine: '将工作流应用到 1970-01-01T00:00:00.300Z -> 1970-01-01T00:00:00.400Z 的当前侧。',
    })
  })

  it('can anchor the workflow to the previous side', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: pattern({ occurrences: [{ currentCapturedAt: 500, previousCapturedAt: 400 }] }) as any,
      preferredSide: 'previous',
    })).toEqual({
      currentCapturedAt: 500,
      previousCapturedAt: 400,
      side: 'previous',
      summaryLine: '将工作流应用到 1970-01-01T00:00:00.400Z -> 1970-01-01T00:00:00.500Z 的前一侧。',
    })
  })

  it('does not turn structured body metadata into a fixed workflow instruction', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: pattern({
        bodyContinuityPattern: true,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
        summaryLine: '任意描述文本',
      }) as any,
      preferredSide: 'current',
    })).toEqual({
      currentCapturedAt: 400,
      previousCapturedAt: 300,
      side: 'current',
      summaryLine: '将工作流应用到 1970-01-01T00:00:00.300Z -> 1970-01-01T00:00:00.400Z 的当前侧。',
    })
  })
})
