import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusDiffSummary } from './performance-visualizer-self-evolution-focus-diff'

describe('performance visualizer self evolution focus diff', () => {
  it('returns null when there is no captured snapshot to compare against', () => {
    expect(buildSelfEvolutionFocusDiffSummary({
      current: {
        selectedCardId: 'repair-path',
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
      snapshot: null,
    })).toBeNull()
  })

  it('reports no drift when the current focus still matches the last snapshot', () => {
    expect(buildSelfEvolutionFocusDiffSummary({
      current: {
        selectedCardId: 'repair-path',
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
      snapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-rest-1',
        decisionTraceId: 'trace-rest-1',
        activeThreadId: 'runtime-thread-rest-1',
        selectedCardId: 'repair-path',
        explanation: 'Focused repair-path because it points to proactive-action-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
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
      },
    })).toEqual([
      '聚焦卡片：未变化（修复路径）',
      '证据面板：未变化',
      '轨迹段：未变化',
      '轨迹事件：未变化（接管事件）',
    ])
  })

  it('reports focus drift across card, evidence, trace sections, and recommended event', () => {
    expect(buildSelfEvolutionFocusDiffSummary({
      current: {
        selectedCardId: 'repair-owner',
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
        explanation: 'Focused repair-owner because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-person-state.',
      },
      snapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-rest-1',
        decisionTraceId: 'trace-rest-1',
        activeThreadId: 'runtime-thread-rest-1',
        selectedCardId: 'repair-path',
        explanation: 'Focused repair-path because it points to proactive-action-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
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
      },
    })).toEqual([
      '聚焦卡片：修复路径 -> 修复归属',
      '证据面板：主动行动链 -> 运行时连续性投影 => 显形权威投影 -> 运行时连续性投影',
      '轨迹段：轨迹消费 -> 轨迹细节 => 轨迹消费 -> 轨迹时间线 -> 选中轨迹事件',
      '轨迹事件：接管事件 -> 人格状态事件',
    ])
  })
})
