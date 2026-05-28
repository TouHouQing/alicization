import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatternContext } from './performance-visualizer-self-evolution-focus-history-pattern-context'

describe('performance visualizer self evolution focus history pattern context', () => {
  it('returns null when the pattern has no recorded occurrences', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'focus:repair-path->repair-owner|event:a->b|evidence:none|trace:none',
        occurrenceCount: 0,
        summaryLine: '0次 修复路径 -> 修复归属',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'a -> b',
        evidenceGained: [],
        evidenceLost: [],
        traceTargetsGained: [],
        traceTargetsLost: [],
        occurrences: [],
      },
      preferredSide: 'current',
    })).toBeNull()
  })

  it('selects the latest occurrence current side by default so workflow application restores the newest drift context', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'focus:repair-owner->repair-path|event:event-person-state->event-takeover|evidence:+private-thought-governance-chain,-renderer-authority-projection|trace:+selected-trace-event,+trace-details,-trace-timeline',
        occurrenceCount: 2,
        summaryLine: '2次 修复归属 -> 修复路径 | 人格状态事件 -> 接管事件',
        focusCardTransition: 'repair-owner -> repair-path',
        traceEventTransition: 'event-person-state -> event-takeover',
        evidenceGained: ['private-thought-governance-chain'],
        evidenceLost: ['renderer-authority-projection'],
        traceTargetsGained: ['selected-trace-event', 'trace-details'],
        traceTargetsLost: ['trace-timeline'],
        occurrences: [
          {
            currentCapturedAt: 400,
            previousCapturedAt: 300,
          },
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
      preferredSide: 'current',
    })).toEqual({
      currentCapturedAt: 400,
      previousCapturedAt: 300,
      side: 'current',
      summaryLine: '将工作流应用到 1970-01-01T00:00:00.300Z -> 1970-01-01T00:00:00.400Z 的当前侧。',
    })
  })

  it('can anchor the workflow to the previous side when the caller wants the pre-drift baseline', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,-private-thought-governance-chain|trace:+trace-timeline,-selected-trace-event,-trace-details',
        occurrenceCount: 3,
        summaryLine: '3次 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: ['private-thought-governance-chain'],
        traceTargetsGained: ['trace-timeline'],
        traceTargetsLost: ['selected-trace-event', 'trace-details'],
        occurrences: [
          {
            currentCapturedAt: 500,
            previousCapturedAt: 400,
          },
          {
            currentCapturedAt: 300,
            previousCapturedAt: 200,
          },
          {
            currentCapturedAt: 100,
            previousCapturedAt: 50,
          },
        ],
      },
      preferredSide: 'previous',
    })).toEqual({
      currentCapturedAt: 500,
      previousCapturedAt: 400,
      side: 'previous',
      summaryLine: '将工作流应用到 1970-01-01T00:00:00.400Z -> 1970-01-01T00:00:00.500Z 的前一侧。',
    })
  })
})
