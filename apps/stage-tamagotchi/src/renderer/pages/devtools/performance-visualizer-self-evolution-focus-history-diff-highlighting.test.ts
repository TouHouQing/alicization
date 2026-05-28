import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryDiffHighlighting } from './performance-visualizer-self-evolution-focus-history-diff-highlighting'

describe('performance visualizer self evolution focus history diff highlighting', () => {
  it('returns neutral highlighting when there is no comparison context', () => {
    expect(buildSelfEvolutionFocusHistoryDiffHighlighting(null)).toEqual({
      evidencePanels: {},
      traceSections: {},
    })
  })

  it('marks evidence panels and trace sections as shared/current-only/previous-only', () => {
    expect(buildSelfEvolutionFocusHistoryDiffHighlighting({
      previous: {
        capturedAt: 100,
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-owner',
        recommendedTraceEventId: 'event-person-state',
        evidenceTargets: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        traceTargets: [
          'trace-consumption',
          'trace-timeline',
        ],
      },
      current: {
        capturedAt: 200,
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-2',
        selectedCardId: 'repair-path',
        recommendedTraceEventId: 'event-takeover',
        evidenceTargets: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        traceTargets: [
          'trace-consumption',
          'trace-details',
          'selected-trace-event',
        ],
      },
      focusCardChanged: true,
      traceEventChanged: true,
      evidenceGained: ['private-thought-governance-chain'],
      evidenceLost: ['renderer-authority-projection'],
      traceTargetsGained: ['trace-details', 'selected-trace-event'],
      traceTargetsLost: ['trace-timeline'],
      summaryLines: [],
    })).toEqual({
      evidencePanels: {
        'private-thought-governance-chain': 'current-only',
        'renderer-authority-projection': 'previous-only',
        'runtime-continuity-projection': 'shared',
      },
      traceSections: {
        'trace-consumption': 'shared',
        'trace-details': 'current-only',
        'selected-trace-event': 'current-only',
        'trace-timeline': 'previous-only',
      },
    })
  })

  it('keeps purely stable targets marked as shared when only the event drifted', () => {
    expect(buildSelfEvolutionFocusHistoryDiffHighlighting({
      previous: {
        capturedAt: 100,
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        recommendedTraceEventId: 'event-governance',
        evidenceTargets: ['private-thought-governance-chain'],
        traceTargets: ['trace-details'],
      },
      current: {
        capturedAt: 200,
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        recommendedTraceEventId: 'event-takeover',
        evidenceTargets: ['private-thought-governance-chain'],
        traceTargets: ['trace-details'],
      },
      focusCardChanged: false,
      traceEventChanged: true,
      evidenceGained: [],
      evidenceLost: [],
      traceTargetsGained: [],
      traceTargetsLost: [],
      summaryLines: [],
    })).toEqual({
      evidencePanels: {
        'private-thought-governance-chain': 'shared',
      },
      traceSections: {
        'trace-details': 'shared',
      },
    })
  })
})
