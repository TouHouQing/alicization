import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusSnapshot } from './performance-visualizer-self-evolution-focus-snapshot'

describe('performance visualizer self evolution focus snapshot', () => {
  it('captures the current self-evolution focus state into a portable diagnostic snapshot', () => {
    expect(buildSelfEvolutionFocusSnapshot({
      candidateId: 'candidate-rest-1',
      decisionTraceId: 'trace-rest-1',
      activeThreadId: 'runtime-thread-rest-1',
      focusPlan: {
        selectedCardId: 'repair-path',
        highlightedEvidencePanelIds: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-takeover',
        explanation: 'Focused repair-path because it points to private-thought-governance-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
      },
      capturedAt: 2468,
    })).toEqual({
      version: 'self-evolution-focus-snapshot/v1',
      candidateId: 'candidate-rest-1',
      decisionTraceId: 'trace-rest-1',
      activeThreadId: 'runtime-thread-rest-1',
      selectedCardId: 'repair-path',
      explanation: 'Focused repair-path because it points to private-thought-governance-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
      highlightedEvidencePanelIds: [
        'private-thought-governance-chain',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
      ],
      recommendedTraceEventId: 'event-takeover',
      capturedAt: 2468,
    })
  })

  it('returns null when no focus plan is selected', () => {
    expect(buildSelfEvolutionFocusSnapshot({
      candidateId: 'candidate-rest-1',
      decisionTraceId: 'trace-rest-1',
      activeThreadId: 'runtime-thread-rest-1',
      focusPlan: {
        selectedCardId: null,
        highlightedEvidencePanelIds: [],
        highlightedTraceSectionIds: [],
        recommendedTraceEventId: null,
        explanation: null,
      },
      capturedAt: 2468,
    })).toBeNull()
  })
})
