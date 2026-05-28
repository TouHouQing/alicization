import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryEventLocalization } from './performance-visualizer-self-evolution-focus-history-event-localization'

describe('performance visualizer self evolution focus history event localization', () => {
  it('returns neutral state when no comparison is selected', () => {
    expect(buildSelfEvolutionFocusHistoryEventLocalization({
      comparison: null,
      selectedSide: null,
      traceEvents: [
        { id: 'event-1', kind: 'takeover-audit', summary: 'fallback=observe-first' },
      ],
    })).toEqual({
      timelineStates: {},
      selectedEventState: null,
    })
  })

  it('marks the recommended trace event and event-category anchors for the current side', () => {
    expect(buildSelfEvolutionFocusHistoryEventLocalization({
      comparison: {
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
      },
      selectedSide: 'current',
      traceEvents: [
        { id: 'event-governance', kind: 'governance-normalized', summary: 'turn=ambient | truth=bounded' },
        { id: 'event-person-state', kind: 'person-state-updated', summary: 'sourceTrail=2' },
        { id: 'event-takeover', kind: 'takeover-audit', summary: 'fallback=observe-first' },
      ],
    })).toEqual({
      timelineStates: {
        'event-governance': 'candidate-anchor',
        'event-person-state': 'candidate-anchor',
        'event-takeover': 'recommended',
      },
      selectedEventState: 'recommended',
    })
  })

  it('marks the previous-side recommended event when restoring the previous state', () => {
    expect(buildSelfEvolutionFocusHistoryEventLocalization({
      comparison: {
        previous: {
          capturedAt: 100,
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          recommendedTraceEventId: 'event-person-state',
          evidenceTargets: ['renderer-authority-projection'],
          traceTargets: ['trace-timeline'],
        },
        current: {
          capturedAt: 200,
          candidateId: 'candidate-2',
          decisionTraceId: 'trace-2',
          activeThreadId: 'thread-2',
          selectedCardId: 'repair-path',
          recommendedTraceEventId: 'event-takeover',
          evidenceTargets: ['private-thought-governance-chain'],
          traceTargets: ['selected-trace-event'],
        },
        focusCardChanged: true,
        traceEventChanged: true,
        evidenceGained: ['private-thought-governance-chain'],
        evidenceLost: ['renderer-authority-projection'],
        traceTargetsGained: ['selected-trace-event'],
        traceTargetsLost: ['trace-timeline'],
        summaryLines: [],
      },
      selectedSide: 'previous',
      traceEvents: [
        { id: 'event-person-state', kind: 'person-state-updated', summary: 'sourceTrail=2' },
        { id: 'event-takeover', kind: 'takeover-audit', summary: 'fallback=observe-first' },
      ],
    })).toEqual({
      timelineStates: {
        'event-person-state': 'recommended',
        'event-takeover': 'candidate-anchor',
      },
      selectedEventState: 'recommended',
    })
  })
})
