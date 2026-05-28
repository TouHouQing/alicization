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
          highlightedEvidencePanelIds: ['private-thought-governance-chain'],
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
            'private-thought-governance-chain',
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
      highlightedEvidencePanelIds: [
        'private-thought-governance-chain',
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
            'private-thought-governance-chain',
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
            'private-thought-governance-chain',
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
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
      ],
      highlightedTraceSectionIds: [],
    })
  })

  it('restores a same-her continuity governance snapshot without recasting it as a drift repair frame', () => {
    expect(buildSelfEvolutionFocusHistoryRestorePlan({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-governance-2',
          decisionTraceId: 'trace-governance-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'same-her governance reconfirmed',
          highlightedEvidencePanelIds: [
            'candidate-trajectory-summary',
            'proactive-decision-consumption-summary',
            'identity-drift-governance-summary',
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
          candidateId: 'candidate-governance-1',
          decisionTraceId: 'trace-governance-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'same-her governance under review',
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
        currentDecisionTraceId: 'trace-governance-2',
        previousDecisionTraceId: 'trace-governance-1',
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
      candidateId: 'candidate-governance-2',
      decisionTraceId: 'trace-governance-2',
      selectedCardId: 'first-check',
      recommendedTraceEventId: 'event-governance',
      shouldDrillTrace: true,
      highlightedEvidencePanelIds: [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
      ],
    })
  })
})
