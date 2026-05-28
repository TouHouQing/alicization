import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistorySummary } from './performance-visualizer-self-evolution-focus-history-summary'

describe('performance visualizer self evolution focus history summary', () => {
  it('summarizes stable and drifting focus signals across multiple snapshots', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
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
      '历史快照数：3',
      '聚焦卡片：存在漂移（修复路径 x2，修复归属 x1）',
      '稳定证据面板：运行时连续性投影',
      '漂移证据面板：私有思绪治理链，显形权威投影',
      '轨迹事件：存在漂移（接管事件，治理事件，人格状态事件）',
    ])
  })

  it('returns null when history is empty', () => {
    expect(buildSelfEvolutionFocusHistorySummary([])).toBeNull()
  })
})
