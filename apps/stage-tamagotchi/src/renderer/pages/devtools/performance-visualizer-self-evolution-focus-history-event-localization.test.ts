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
            'proactive-action-chain',
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
        evidenceGained: ['proactive-action-chain'],
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
          evidenceTargets: ['proactive-action-chain'],
          traceTargets: ['selected-trace-event'],
        },
        focusCardChanged: true,
        traceEventChanged: true,
        evidenceGained: ['proactive-action-chain'],
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

  it('keeps body-led continuity localization anchored on takeover plus person-state candidates when runtime continuity and selected trace event stay highlighted together', () => {
    expect(buildSelfEvolutionFocusHistoryEventLocalization({
      comparison: {
        previous: {
          capturedAt: 220,
          candidateId: 'candidate-body-1',
          decisionTraceId: 'trace-body-1',
          activeThreadId: 'thread-body-1',
          selectedCardId: 'repair-owner',
          recommendedTraceEventId: 'event-person-state',
          evidenceTargets: [
            'renderer-authority-projection',
          ],
          traceTargets: [
            'trace-timeline',
          ],
        },
        current: {
          capturedAt: 320,
          candidateId: 'candidate-body-2',
          decisionTraceId: 'trace-body-2',
          activeThreadId: 'thread-body-2',
          selectedCardId: 'repair-owner',
          recommendedTraceEventId: 'event-takeover',
          evidenceTargets: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          traceTargets: [
            'trace-consumption',
            'trace-timeline',
            'selected-trace-event',
          ],
        },
        focusCardChanged: false,
        traceEventChanged: true,
        evidenceGained: ['runtime-continuity-projection'],
        evidenceLost: [],
        traceTargetsGained: ['trace-consumption', 'selected-trace-event'],
        traceTargetsLost: [],
        summaryLines: [
          '身体连续性：运行时连续性投影持续稳定，显形权威投影在相邻快照间反复出入，说明这段 same living segment 更像先由身体线继续托住。',
        ],
      },
      selectedSide: 'current',
      traceEvents: [
        { id: 'event-governance', kind: 'governance-normalized', summary: 'turn=ambient | truth=bounded' },
        { id: 'event-person-state', kind: 'person-state-updated', summary: 'sourceTrail=body-segment' },
        { id: 'event-takeover', kind: 'takeover-audit', summary: 'body line still carries the living segment first' },
      ],
    })).toEqual({
      timelineStates: {
        'event-person-state': 'candidate-anchor',
        'event-takeover': 'recommended',
      },
      selectedEventState: 'recommended',
    })
  })
})
