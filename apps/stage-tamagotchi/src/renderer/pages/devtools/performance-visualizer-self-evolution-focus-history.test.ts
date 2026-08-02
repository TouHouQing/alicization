import { describe, expect, it } from 'vitest'

import { appendSelfEvolutionFocusSnapshotHistory } from './performance-visualizer-self-evolution-focus-history'

describe('performance visualizer self evolution focus history', () => {
  it('prepends the latest snapshot and sorts history by capturedAt descending', () => {
    const history = appendSelfEvolutionFocusSnapshotHistory({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'old snapshot',
          highlightedEvidencePanelIds: ['proactive-action-chain'],
          highlightedTraceSectionIds: ['trace-details'],
          recommendedTraceEventId: 'event-old',
          capturedAt: 100,
        },
      ],
      snapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-2',
        selectedCardId: 'repair-owner',
        explanation: 'new snapshot',
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['trace-timeline'],
        recommendedTraceEventId: 'event-new',
        capturedAt: 200,
      },
      limit: 5,
    })

    expect(history.map(item => item.capturedAt)).toEqual([200, 100])
    expect(history[0]?.candidateId).toBe('candidate-2')
  })

  it('trims history to the requested limit', () => {
    const history = appendSelfEvolutionFocusSnapshotHistory({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-1',
          highlightedEvidencePanelIds: ['proactive-action-chain'],
          highlightedTraceSectionIds: ['trace-details'],
          recommendedTraceEventId: 'event-1',
          capturedAt: 100,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-2',
          decisionTraceId: 'trace-2',
          activeThreadId: 'thread-2',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-2',
          highlightedEvidencePanelIds: ['proactive-action-chain'],
          highlightedTraceSectionIds: ['trace-details'],
          recommendedTraceEventId: 'event-2',
          capturedAt: 200,
        },
      ],
      snapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-owner',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['trace-timeline'],
        recommendedTraceEventId: 'event-3',
        capturedAt: 300,
      },
      limit: 2,
    })

    expect(history.map(item => item.capturedAt)).toEqual([300, 200])
  })
})
