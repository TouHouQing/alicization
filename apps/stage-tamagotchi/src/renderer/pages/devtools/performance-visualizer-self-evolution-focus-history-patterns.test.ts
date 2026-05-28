import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatterns } from './performance-visualizer-self-evolution-focus-history-patterns'

describe('performance visualizer self evolution focus history patterns', () => {
  it('returns an empty list when history is too short to form a drift pattern', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([])).toEqual([])
    expect(buildSelfEvolutionFocusHistoryPatterns([
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
    ])).toEqual([])
  })

  it('aggregates repeated drift transitions into recurring patterns', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-4',
        decisionTraceId: 'trace-4',
        activeThreadId: 'thread-4',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-4',
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
        capturedAt: 400,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-owner',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 300,
      },
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
    ])).toEqual([
      {
        patternKey: 'focus:repair-owner->repair-path|event:event-person-state->event-takeover|evidence:+private-thought-governance-chain,-renderer-authority-projection|trace:+selected-trace-event,+trace-details,-trace-timeline',
        occurrenceCount: 2,
        summaryLine: '2次 修复归属 -> 修复路径 | 人格状态事件 -> 接管事件 | +私有思绪治理链 -显形权威投影 | +选中轨迹事件 +轨迹细节 -轨迹时间线',
        focusCardTransition: 'repair-owner -> repair-path',
        traceEventTransition: 'event-person-state -> event-takeover',
        evidenceGained: ['private-thought-governance-chain'],
        evidenceLost: ['renderer-authority-projection'],
        traceTargetsGained: ['selected-trace-event', 'trace-details'],
        traceTargetsLost: ['trace-timeline'],
        occurrences: [
          {
            currentCapturedAt: 400,
            previousCapturedAt: 300,
          },
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
      {
        patternKey: 'focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,-private-thought-governance-chain|trace:+trace-timeline,-selected-trace-event,-trace-details',
        occurrenceCount: 1,
        summaryLine: '1次 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 -私有思绪治理链 | +轨迹时间线 -选中轨迹事件 -轨迹细节',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: ['private-thought-governance-chain'],
        traceTargetsGained: ['trace-timeline'],
        traceTargetsLost: ['selected-trace-event', 'trace-details'],
        occurrences: [
          {
            currentCapturedAt: 300,
            previousCapturedAt: 200,
          },
        ],
      },
    ])
  })

  it('keeps distinct patterns separated when only event drift repeats under a stable focus frame', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: ['private-thought-governance-chain'],
        highlightedTraceSectionIds: ['trace-details'],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 300,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-2',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-2',
        highlightedEvidencePanelIds: ['private-thought-governance-chain'],
        highlightedTraceSectionIds: ['trace-details'],
        recommendedTraceEventId: 'event-governance',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-1',
        highlightedEvidencePanelIds: ['private-thought-governance-chain'],
        highlightedTraceSectionIds: ['trace-details'],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        patternKey: 'focus:repair-path->repair-path|event:event-governance->event-takeover|evidence:none|trace:none',
        occurrenceCount: 1,
        summaryLine: '1次 修复路径 -> 修复路径 | 治理事件 -> 接管事件',
        focusCardTransition: 'repair-path -> repair-path',
        traceEventTransition: 'event-governance -> event-takeover',
        evidenceGained: [],
        evidenceLost: [],
        traceTargetsGained: [],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 300,
            previousCapturedAt: 200,
          },
        ],
      },
      {
        patternKey: 'focus:repair-path->repair-path|event:event-takeover->event-governance|evidence:none|trace:none',
        occurrenceCount: 1,
        summaryLine: '1次 修复路径 -> 修复路径 | 接管事件 -> 治理事件',
        focusCardTransition: 'repair-path -> repair-path',
        traceEventTransition: 'event-takeover -> event-governance',
        evidenceGained: [],
        evidenceLost: [],
        traceTargetsGained: [],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
    ])
  })
})
