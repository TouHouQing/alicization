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
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        highlightedEvidencePanelIds: [
          'proactive-action-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-takeover',
        explanation: 'Focused repair-path because it points to proactive-action-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
      },
      capturedAt: 2468,
    })).toEqual({
      version: 'self-evolution-focus-snapshot/v1',
      candidateId: 'candidate-rest-1',
      decisionTraceId: 'trace-rest-1',
      activeThreadId: 'runtime-thread-rest-1',
      selectedCardId: 'repair-path',
      explanation: 'Focused repair-path because it points to proactive-action-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      highlightedEvidencePanelIds: [
        'proactive-action-chain',
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [],
        highlightedTraceSectionIds: [],
        recommendedTraceEventId: null,
        explanation: null,
      },
      capturedAt: 2468,
    })).toBeNull()
  })

  it('carries structured surviving visible lane metadata into the portable snapshot so quieter continuity', () => {
    expect(buildSelfEvolutionFocusSnapshot({
      candidateId: 'candidate-face-voice-only-1',
      decisionTraceId: 'trace-face-voice-only-1',
      activeThreadId: 'runtime-thread-face-voice-only-1',
      focusPlan: {
        selectedCardId: 'repair-path',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-face-voice-only-1',
        explanation: 'Focused repair-path because quieter continuity',
      },
      capturedAt: 3579,
    })).toEqual({
      version: 'self-evolution-focus-snapshot/v1',
      candidateId: 'candidate-face-voice-only-1',
      decisionTraceId: 'trace-face-voice-only-1',
      activeThreadId: 'runtime-thread-face-voice-only-1',
      selectedCardId: 'repair-path',
      explanation: 'Focused repair-path because quieter continuity',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync+voice-only',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-face-voice-only-1',
      capturedAt: 3579,
    })
  })
})
