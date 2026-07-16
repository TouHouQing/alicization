import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusDiffSummary } from './performance-visualizer-self-evolution-focus-diff'

describe('performance visualizer self evolution focus diff', () => {
  it('returns null when there is no captured snapshot to compare against', () => {
    expect(buildSelfEvolutionFocusDiffSummary({
      current: {
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
      snapshot: null,
    })).toBeNull()
  })

  it('reports no drift when the current focus still matches the last snapshot', () => {
    expect(buildSelfEvolutionFocusDiffSummary({
      current: {
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
      snapshot: {
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
      },
    })).toEqual([
      '聚焦卡片：修复路径 -> 修复归属',
      '证据面板：私有思绪治理链 -> 运行时连续性投影 => 显形权威投影 -> 运行时连续性投影',
      '轨迹段：轨迹消费 -> 轨迹细节 => 轨迹消费 -> 轨迹时间线 -> 选中轨迹事件',
      '轨迹事件：接管事件 -> 人格状态事件',
    ])
  })

  it('describes identity-continuity', () => {
    expect(buildSelfEvolutionFocusDiffSummary({
      current: {
        selectedCardId: 'first-check',
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
        explanation: 'Focused first-check because it points to candidate-trajectory-summary -> proactive-decision-consumption-summary -> identity-drift-governance-summary, then narrows into trace-consumption -> trace-details and event event-governance.',
      },
      snapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-governance-1',
        decisionTraceId: 'trace-governance-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-owner',
        explanation: 'Focused repair-owner because identity-continuity',
        highlightedEvidencePanelIds: [
          'candidate-trajectory-summary',
          'proactive-decision-consumption-summary',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 3000,
      },
    })).toEqual([
      '聚焦卡片：修复归属 -> 首查点',
      '证据面板：候选轨迹摘要 -> 主动决策消费摘要 => 候选轨迹摘要 -> 主动决策消费摘要 -> 身份漂移治理摘要',
      '轨迹段：轨迹消费 => 轨迹消费 -> 轨迹细节',
      '轨迹事件：接管事件 -> 治理事件',
      '连续性说明：这不是普通聚焦漂移，而是 identity-continuity',
    ])
  })
})
