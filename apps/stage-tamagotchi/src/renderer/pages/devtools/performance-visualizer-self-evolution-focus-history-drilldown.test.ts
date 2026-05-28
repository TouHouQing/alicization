import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryDrilldown } from './performance-visualizer-self-evolution-focus-history-drilldown'

describe('performance visualizer self evolution focus history drilldown', () => {
  it('returns an empty list when there are not enough snapshots to compare', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([])).toEqual([])
    expect(buildSelfEvolutionFocusHistoryDrilldown([
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

  it('reports the exact adjacent snapshot pair where focus drift happened', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 300,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-2',
        selectedCardId: 'repair-owner',
        explanation: 'snapshot-2',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 200,
      },
    ])).toEqual([
      {
        currentCapturedAt: 300,
        previousCapturedAt: 200,
        currentDecisionTraceId: 'trace-3',
        previousDecisionTraceId: 'trace-2',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '聚焦卡片：修复归属 -> 修复路径',
          '证据面板：显形权威投影 -> 运行时连续性投影 => 私有思绪治理链 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 -> 选中轨迹事件 => 轨迹消费 -> 轨迹细节',
          '轨迹事件：人格状态事件 -> 接管事件',
        ],
      },
    ])
  })

  it('skips adjacent pairs that stayed stable and keeps only the drifting transition', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-governance',
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
        ],
        recommendedTraceEventId: 'event-governance',
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
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '聚焦卡片：修复归属 -> 修复路径',
          '证据面板：显形权威投影 -> 运行时连续性投影 => 私有思绪治理链 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 => 轨迹消费 -> 轨迹细节',
          '轨迹事件：人格状态事件 -> 治理事件',
        ],
      },
    ])
  })

  it('keeps an adjacent pair when only the recommended trace event drifted', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
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
        selectedCardId: 'repair-path',
        explanation: 'snapshot-1',
        highlightedEvidencePanelIds: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-governance',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: false,
        changedEvidenceTargets: false,
        changedTraceTargets: false,
        changedTraceEvent: true,
        lines: [
          '轨迹事件：治理事件 -> 接管事件',
        ],
      },
    ])
  })
})
