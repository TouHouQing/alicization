import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryDiffHighlighting } from './performance-visualizer-self-evolution-focus-history-diff-highlighting'

describe('performance visualizer self evolution focus history diff highlighting', () => {
  it('returns neutral highlighting when there is no comparison context', () => {
    expect(buildSelfEvolutionFocusHistoryDiffHighlighting(null)).toEqual({
      evidencePanels: {},
      traceSections: {},
      rendererRejoinSurfaceKey: null,
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
    })).toEqual({
      evidencePanels: {
        'proactive-action-chain': 'current-only',
        'renderer-authority-projection': 'previous-only',
        'runtime-continuity-projection': 'shared',
      },
      traceSections: {
        'trace-consumption': 'shared',
        'trace-details': 'current-only',
        'selected-trace-event': 'current-only',
        'trace-timeline': 'previous-only',
      },
      rendererRejoinSurfaceKey: null,
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
        evidenceTargets: ['proactive-action-chain'],
        traceTargets: ['trace-details'],
      },
      current: {
        capturedAt: 200,
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        recommendedTraceEventId: 'event-takeover',
        evidenceTargets: ['proactive-action-chain'],
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
        'proactive-action-chain': 'shared',
      },
      traceSections: {
        'trace-details': 'shared',
      },
      rendererRejoinSurfaceKey: null,
    })
  })

  it('keeps body-led continuity diff highlighting anchored on shared runtime continuity while renderer authority and trace drill targets expand around it', () => {
    expect(buildSelfEvolutionFocusHistoryDiffHighlighting({
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
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
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
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      focusCardChanged: false,
      traceEventChanged: true,
      evidenceGained: ['runtime-continuity-projection'],
      evidenceLost: [],
      traceTargetsGained: ['trace-consumption', 'selected-trace-event'],
      traceTargetsLost: [],
      summaryLines: [
        '身体连续性：运行时连续性投影持续稳定，显形权威投影在相邻快照间反复出入，说明这段 same living segment 更像先由身体线继续托住。',
      ],
    })).toEqual({
      evidencePanels: {
        'renderer-authority-projection': 'shared',
        'runtime-continuity-projection': 'current-only',
      },
      traceSections: {
        'trace-consumption': 'current-only',
        'trace-timeline': 'shared',
        'selected-trace-event': 'current-only',
      },
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
    })
  })

  it('keeps full-cross-modal-lock diff highlighting attached to the renderer rejoin surface so the same locked living segment stays visible in comparison banners', () => {
    expect(buildSelfEvolutionFocusHistoryDiffHighlighting({
      previous: {
        capturedAt: 330,
        candidateId: 'candidate-lock-1',
        decisionTraceId: 'trace-lock-1',
        activeThreadId: 'thread-lock-1',
        selectedCardId: 'repair-owner',
        recommendedTraceEventId: 'event-lock-prev',
        evidenceTargets: [
          'runtime-continuity-projection',
          'renderer-authority-projection',
        ],
        traceTargets: [
          'trace-consumption',
          'trace-timeline',
        ],
      },
      current: {
        capturedAt: 430,
        candidateId: 'candidate-lock-2',
        decisionTraceId: 'trace-lock-2',
        activeThreadId: 'thread-lock-2',
        selectedCardId: 'repair-owner',
        recommendedTraceEventId: 'event-lock-current',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        evidenceTargets: [
          'runtime-continuity-projection',
          'renderer-authority-projection',
        ],
        traceTargets: [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ],
      },
      bodyContinuityPhase: 'full-cross-modal-lock',
      focusCardChanged: false,
      traceEventChanged: true,
      evidenceGained: [],
      evidenceLost: [],
      traceTargetsGained: ['selected-trace-event'],
      traceTargetsLost: [],
      summaryLines: [
        '身体连续性：身体线与 Live2D 显形权威仍共同锁在同一段 living segment 上。',
      ],
    })).toEqual({
      evidencePanels: {
        'runtime-continuity-projection': 'shared',
        'renderer-authority-projection': 'shared',
      },
      traceSections: {
        'trace-consumption': 'shared',
        'trace-timeline': 'shared',
        'selected-trace-event': 'current-only',
      },
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
    })
  })

  it('keeps renderer-rejoin-without-body diff highlighting attached to the visible renderer surface so body-loss is not hidden in comparison banners', () => {
    expect(buildSelfEvolutionFocusHistoryDiffHighlighting({
      previous: {
        capturedAt: 530,
        candidateId: 'candidate-visible-1',
        decisionTraceId: 'trace-visible-1',
        activeThreadId: 'thread-visible-1',
        selectedCardId: 'repair-owner',
        recommendedTraceEventId: 'event-visible-prev',
        evidenceTargets: [
          'runtime-continuity-projection',
        ],
        traceTargets: [
          'trace-timeline',
        ],
      },
      current: {
        capturedAt: 630,
        candidateId: 'candidate-visible-2',
        decisionTraceId: 'trace-visible-2',
        activeThreadId: 'thread-visible-2',
        selectedCardId: 'repair-owner',
        recommendedTraceEventId: 'event-visible-current',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        evidenceTargets: [
          'renderer-authority-projection',
        ],
        traceTargets: [
          'trace-timeline',
          'selected-trace-event',
        ],
      },
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      focusCardChanged: false,
      traceEventChanged: true,
      evidenceGained: ['renderer-authority-projection'],
      evidenceLost: ['runtime-continuity-projection'],
      traceTargetsGained: ['selected-trace-event'],
      traceTargetsLost: [],
      summaryLines: [
        '身体连续性：VRM 显形权威虽然已经回接，但身体线没有继续托住同一段 living segment。',
      ],
    })).toEqual({
      evidencePanels: {
        'runtime-continuity-projection': 'previous-only',
        'renderer-authority-projection': 'current-only',
      },
      traceSections: {
        'trace-timeline': 'shared',
        'selected-trace-event': 'current-only',
      },
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
    })
  })
})
