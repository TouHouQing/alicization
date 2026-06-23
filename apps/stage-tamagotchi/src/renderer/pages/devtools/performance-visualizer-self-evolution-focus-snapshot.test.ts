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
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回。',
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
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回。',
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        bodyContinuityGovernanceNote: null,
        highlightedEvidencePanelIds: [],
        highlightedTraceSectionIds: [],
        recommendedTraceEventId: null,
        explanation: null,
      },
      capturedAt: 2468,
    })).toBeNull()
  })

  it('carries structured surviving visible lane metadata into the portable snapshot so quieter same-her continuity does not fall back to generic body-loss text downstream', () => {
    expect(buildSelfEvolutionFocusSnapshot({
      candidateId: 'candidate-face-voice-only-1',
      decisionTraceId: 'trace-face-voice-only-1',
      activeThreadId: 'runtime-thread-face-voice-only-1',
      focusPlan: {
        selectedCardId: 'repair-path',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
        bodyContinuityGovernanceNote: '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-face-voice-only-1',
        explanation: 'Focused repair-path because quieter same-her continuity still survives on face lipsync voice while body motion remain pending rejoin.',
      },
      capturedAt: 3579,
    })).toEqual({
      version: 'self-evolution-focus-snapshot/v1',
      candidateId: 'candidate-face-voice-only-1',
      decisionTraceId: 'trace-face-voice-only-1',
      activeThreadId: 'runtime-thread-face-voice-only-1',
      selectedCardId: 'repair-path',
      explanation: 'Focused repair-path because quieter same-her continuity still survives on face lipsync voice while body motion remain pending rejoin.',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync+voice-only',
      bodyContinuityGovernanceNote: '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。',
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
