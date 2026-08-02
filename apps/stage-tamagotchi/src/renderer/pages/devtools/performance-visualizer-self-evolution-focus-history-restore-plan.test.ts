import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryRestorePlan } from './performance-visualizer-self-evolution-focus-history-restore-plan'

describe('performance visualizer self evolution focus history restore plan', () => {
  it('returns null when there is no matching snapshot for the selected transition side', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
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
      ],
      transition: {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: ['focus-card: repair-owner -> repair-path'],
      },
      side: 'current',
    })).toBeNull()
  })

  it('builds a restore plan for the current side of a drift transition', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-2',
          decisionTraceId: 'trace-2',
          activeThreadId: 'thread-2',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-2',
          highlightedEvidencePanelIds: [
            'proactive-action-chain',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-details',
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 200,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'snapshot-1',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 100,
        },
      ],
      transition: {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'focus-card: repair-owner -> repair-path',
          'trace-event: event-person-state -> event-takeover',
        ],
      },
      side: 'current',
    })).toEqual({
      snapshotCapturedAt: 200,
      candidateId: 'candidate-2',
      decisionTraceId: 'trace-2',
      selectedCardId: 'repair-path',
      recommendedTraceEventId: 'event-takeover',
      shouldDrillTrace: true,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      restoreSummaryLine: null,
      highlightedEvidencePanelIds: [
        'proactive-action-chain',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
        'selected-trace-event',
      ],
    })
  })

  it('builds a restore plan for the previous side of a drift transition', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-2',
          decisionTraceId: 'trace-2',
          activeThreadId: 'thread-2',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-2',
          highlightedEvidencePanelIds: [
            'proactive-action-chain',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-details',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 200,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'snapshot-1',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 100,
        },
      ],
      transition: {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'focus-card: repair-owner -> repair-path',
          'trace-event: event-person-state -> event-takeover',
        ],
      },
      side: 'previous',
    })).toEqual({
      snapshotCapturedAt: 100,
      candidateId: 'candidate-1',
      decisionTraceId: 'trace-1',
      selectedCardId: 'repair-owner',
      recommendedTraceEventId: 'event-person-state',
      shouldDrillTrace: true,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      restoreSummaryLine: null,
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
      ],
    })
  })

  it('does not require trace drilling when the snapshot has no trace focus or recommended event', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: null,
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'snapshot-1',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [],
          recommendedTraceEventId: null,
          capturedAt: 100,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-0',
          decisionTraceId: null,
          activeThreadId: 'thread-0',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-0',
          highlightedEvidencePanelIds: [
            'proactive-action-chain',
          ],
          highlightedTraceSectionIds: [],
          recommendedTraceEventId: null,
          capturedAt: 50,
        },
      ],
      transition: {
        currentCapturedAt: 100,
        previousCapturedAt: 50,
        currentDecisionTraceId: null,
        previousDecisionTraceId: null,
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: false,
        changedTraceEvent: false,
        lines: [
          'focus-card: repair-path -> repair-owner',
        ],
      },
      side: 'current',
    })).toEqual({
      snapshotCapturedAt: 100,
      candidateId: 'candidate-1',
      decisionTraceId: null,
      selectedCardId: 'repair-owner',
      recommendedTraceEventId: null,
      shouldDrillTrace: false,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      restoreSummaryLine: null,
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
      ],
      highlightedTraceSectionIds: [],
    })
  })

  it('preserves body-only-hold restore semantics so the history workflow does not overstate renderer recovery', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-only',
          decisionTraceId: 'trace-body-only',
          activeThreadId: 'thread-body-only',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-body-only',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-body-only',
          capturedAt: 300,
        },
      ],
      transition: {
        currentCapturedAt: 300,
        previousCapturedAt: 200,
        currentDecisionTraceId: 'trace-body-only',
        previousDecisionTraceId: 'trace-previous',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: ['focus-card: repair-owner -> repair-path'],
      },
      side: 'current',
    })).toEqual({
      snapshotCapturedAt: 300,
      candidateId: 'candidate-body-only',
      decisionTraceId: 'trace-body-only',
      selectedCardId: 'repair-path',
      recommendedTraceEventId: 'event-body-only',
      shouldDrillTrace: true,
      bodyContinuityPhase: 'body-only-hold',
      rendererRejoinSurfaceKey: null,
      restoreSummaryLine: '恢复到身体连续性独撑态：身体线仍在独自托住同一段 living segment，当前还不能把显形权威的回接视为已经成立。',
      highlightedEvidencePanelIds: [
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'selected-trace-event',
      ],
    })
  })

  it('preserves full-cross-modal-lock restore semantics with the renderer surface attached', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-lock',
          decisionTraceId: 'trace-lock',
          activeThreadId: 'thread-lock',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-lock',
          bodyContinuityPhase: 'full-cross-modal-lock',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-timeline',
          ],
          recommendedTraceEventId: null,
          capturedAt: 320,
        },
      ],
      transition: {
        currentCapturedAt: 320,
        previousCapturedAt: 220,
        currentDecisionTraceId: 'trace-lock',
        previousDecisionTraceId: 'trace-previous',
        changedFocusCard: false,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: false,
        lines: ['evidence: renderer-authority-projection'],
      },
      side: 'current',
    })).toEqual({
      snapshotCapturedAt: 320,
      candidateId: 'candidate-lock',
      decisionTraceId: 'trace-lock',
      selectedCardId: 'repair-path',
      recommendedTraceEventId: null,
      shouldDrillTrace: true,
      bodyContinuityPhase: 'full-cross-modal-lock',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      restoreSummaryLine: '恢复到跨模态重锁态：身体线与 Live2D 显形权威仍稳定锁在同一段 living segment 上。',
      highlightedEvidencePanelIds: [
        'runtime-continuity-projection',
        'renderer-authority-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-timeline',
      ],
    })
  })

  it('preserves renderer-rejoin-without-body restore semantics so visible recovery is not mistaken for same-body continuity', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-renderer-only',
          decisionTraceId: 'trace-renderer-only',
          activeThreadId: 'thread-renderer-only',
          selectedCardId: 'repair-owner',
          explanation: 'snapshot-renderer-only',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [],
          recommendedTraceEventId: null,
          capturedAt: 340,
        },
      ],
      transition: {
        currentCapturedAt: 340,
        previousCapturedAt: 240,
        currentDecisionTraceId: 'trace-renderer-only',
        previousDecisionTraceId: 'trace-previous',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: false,
        changedTraceEvent: false,
        lines: ['focus-card: first-check -> repair-owner'],
      },
      side: 'current',
    })).toEqual({
      snapshotCapturedAt: 340,
      candidateId: 'candidate-renderer-only',
      decisionTraceId: 'trace-renderer-only',
      selectedCardId: 'repair-owner',
      recommendedTraceEventId: null,
      shouldDrillTrace: false,
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      restoreSummaryLine: '恢复到显形回接失身态：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment。',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
      ],
      highlightedTraceSectionIds: [],
    })
  })

  it('keeps quieter face+lipsync+voice continuity', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-face-lipsync-voice-restore',
          decisionTraceId: 'trace-face-lipsync-voice-restore',
          activeThreadId: 'thread-face-lipsync-voice-restore',
          selectedCardId: 'repair-owner',
          explanation: 'snapshot-face-lipsync-voice-restore',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'face+lipsync+voice-only',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 360,
        },
      ],
      transition: {
        currentCapturedAt: 360,
        previousCapturedAt: 260,
        currentDecisionTraceId: 'trace-face-lipsync-voice-restore',
        previousDecisionTraceId: 'trace-previous',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: ['focus-card: first-check -> repair-owner'],
      },
      side: 'current',
    })).toEqual({
      snapshotCapturedAt: 360,
      candidateId: 'candidate-face-lipsync-voice-restore',
      decisionTraceId: 'trace-face-lipsync-voice-restore',
      selectedCardId: 'repair-owner',
      recommendedTraceEventId: 'event-takeover',
      shouldDrillTrace: true,
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      survivingVisibleLane: 'face+lipsync+voice-only',
      rendererRejoinSurfaceKey: null,
      restoreSummaryLine: '恢复到显形回接失身态：当前仅剩表情、口型、声音维持同一段连续性。',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
      ],
    })
  })

  it('restores a structured continuity evidence snapshot', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-continuity-2',
          decisionTraceId: 'trace-continuity-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'continuity evidence reconfirmed',
          highlightedEvidencePanelIds: [
            'candidate-trajectory-summary',
            'proactive-decision-consumption-summary',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-details',
          ],
          recommendedTraceEventId: 'event-governance',
          capturedAt: 1320,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-continuity-1',
          decisionTraceId: 'trace-continuity-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'continuity evidence under review',
          highlightedEvidencePanelIds: [
            'candidate-trajectory-summary',
            'proactive-decision-consumption-summary',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 1180,
        },
      ],
      transition: {
        currentCapturedAt: 1320,
        previousCapturedAt: 1180,
        currentDecisionTraceId: 'trace-continuity-2',
        previousDecisionTraceId: 'trace-continuity-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'focus-card: repair-owner -> first-check',
          'trace-event: event-takeover -> event-governance',
        ],
      },
      side: 'current',
    })).toEqual({
      snapshotCapturedAt: 1320,
      candidateId: 'candidate-continuity-2',
      decisionTraceId: 'trace-continuity-2',
      selectedCardId: 'first-check',
      recommendedTraceEventId: 'event-governance',
      shouldDrillTrace: true,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      restoreSummaryLine: null,
      highlightedEvidencePanelIds: [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
      ],
    })
  })

  it('restores a body-led continuity snapshot with runtime continuity and trace drill targets intact', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-2',
          decisionTraceId: 'trace-body-2',
          activeThreadId: 'thread-body-2',
          selectedCardId: 'repair-owner',
          explanation: 'body continuity reconfirmed',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-timeline',
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 320,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-1',
          decisionTraceId: 'trace-body-1',
          activeThreadId: 'thread-body-1',
          selectedCardId: 'repair-owner',
          explanation: 'renderer authority only',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 220,
        },
      ],
      transition: {
        currentCapturedAt: 320,
        previousCapturedAt: 220,
        currentDecisionTraceId: 'trace-body-2',
        previousDecisionTraceId: 'trace-body-1',
        changedFocusCard: false,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'evidence-targets: renderer-authority-projection => renderer-authority-projection -> runtime-continuity-projection',
          'trace-targets: trace-timeline => trace-consumption -> trace-timeline -> selected-trace-event',
          'trace-event: event-person-state -> event-takeover',
        ],
      },
      side: 'current',
    })).toEqual({
      snapshotCapturedAt: 320,
      candidateId: 'candidate-body-2',
      decisionTraceId: 'trace-body-2',
      selectedCardId: 'repair-owner',
      recommendedTraceEventId: 'event-takeover',
      shouldDrillTrace: true,
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      restoreSummaryLine: '恢复到身体连续性补回态：身体线已经托住同一段 living segment，并开始沿同一条身体线补回 Live2D 显形权威。',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
    })
  })

  it('prefers explicit snapshot body continuity fields even when the evidence and trace shape alone would be too narrow to infer rejoin', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-explicit',
          decisionTraceId: 'trace-body-explicit',
          activeThreadId: 'thread-body-explicit',
          selectedCardId: 'repair-owner',
          explanation: 'explicit body rejoin',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 420,
        },
      ],
      transition: {
        currentCapturedAt: 420,
        previousCapturedAt: 320,
        currentDecisionTraceId: 'trace-body-explicit',
        previousDecisionTraceId: 'trace-body-prev',
        changedFocusCard: false,
        changedEvidenceTargets: false,
        changedTraceTargets: false,
        changedTraceEvent: false,
        lines: [],
      },
      side: 'current',
    })).toEqual({
      snapshotCapturedAt: 420,
      candidateId: 'candidate-body-explicit',
      decisionTraceId: 'trace-body-explicit',
      selectedCardId: 'repair-owner',
      recommendedTraceEventId: 'event-takeover',
      shouldDrillTrace: true,
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      restoreSummaryLine: '恢复到身体连续性补回态：身体线已经托住同一段 living segment，并开始沿同一条身体线补回 VRM 显形权威。',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-timeline',
      ],
    })
  })

  it('uses a speech-specific restore summary when the stored snapshot says speech authority is the rejoining renderer surface', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-speech',
          decisionTraceId: 'trace-body-speech',
          activeThreadId: 'thread-body-speech',
          selectedCardId: 'repair-owner',
          explanation: 'speech rejoin',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 520,
        },
      ],
      transition: {
        currentCapturedAt: 520,
        previousCapturedAt: 420,
        currentDecisionTraceId: 'trace-body-speech',
        previousDecisionTraceId: 'trace-body-prev',
        changedFocusCard: false,
        changedEvidenceTargets: false,
        changedTraceTargets: false,
        changedTraceEvent: false,
        lines: [],
      },
      side: 'current',
    })).toMatchObject({
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      restoreSummaryLine: '恢复到身体连续性补回态：身体线已经托住同一段 living segment，并开始沿同一条身体线补回 speech 显形权威。',
    })
  })

  it('borrows the structured speech renderer rejoin surface from the paired transition snapshot when the restored side only keeps the body continuity phase', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-speech-current',
          decisionTraceId: 'trace-body-speech-current',
          activeThreadId: 'thread-body-speech-current',
          selectedCardId: 'repair-owner',
          explanation: 'continuity speech rejoin still in progress',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 620,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-speech-previous',
          decisionTraceId: 'trace-body-speech-previous',
          activeThreadId: 'thread-body-speech-previous',
          selectedCardId: 'repair-path',
          explanation: 'speech rejoin anchor',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-timeline',
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 520,
        },
      ],
      transition: {
        currentCapturedAt: 620,
        previousCapturedAt: 520,
        currentDecisionTraceId: 'trace-body-speech-current',
        previousDecisionTraceId: 'trace-body-speech-previous',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [],
      },
      side: 'current',
    })).toMatchObject({
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      restoreSummaryLine: '恢复到身体连续性补回态：身体线已经托住同一段 living segment，并开始沿同一条身体线补回 speech 显形权威。',
    })
  })
})
