import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchorReplayPlan } from './performance-visualizer-self-evolution-adopted-anchor-replay'

describe('performance visualizer self evolution adopted anchor replay', () => {
  it('returns null when the adopted anchor does not have enough traceability to replay', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: null,
      historyTransition: null,
      traceEventSelection: null,
    })).toBeNull()
  })

  it('builds a single replay plan that restores workflow, transition, side, and trace event selection', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-renderer',
        patternSummary: '疑似反复出现的显形权威漂移。',
        workflowHeadline: '3 次反复转移共享同一显形权威漂移特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:00.900Z -> 1970-01-01T00:00:01.100Z 的前一侧。',
        supportingLines: [],
      },
      historyTransition: {
        transitionKey: '1100:900',
        currentCapturedAt: 1100,
        previousCapturedAt: 900,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 900 -> 1100 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-person-state',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-person-state。',
      },
    })).toEqual({
      patternKey: 'pattern-renderer',
      transitionKey: '1100:900',
      selectedSide: 'current',
      eventId: 'event-person-state',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：3 次反复转移共享同一显形权威漂移特征。',
        '历史转移：当前默认连续性锚点对应 900 -> 1100 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-person-state。',
      ],
    })
  })

  it('does not derive replay metadata from supporting prose', () => {
    const legacyPrefix = ['采纳前提', '仍然可追溯到'].join('')
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-renderer',
        patternSummary: '显形诊断',
        workflowHeadline: '显形轨迹',
        workflowContextLine: null,
        supportingLines: [
          `${legacyPrefix}任意历史说明`,
          ['身体承接态', ' -> ', '显形补回态'].join(''),
        ],
      },
      historyTransition: {
        transitionKey: '1100:900',
        selectedSide: 'current',
        summaryLine: '历史转移 900 -> 1100。',
      },
      traceEventSelection: {
        eventId: 'event-person-state',
        summaryLine: '事件 event-person-state。',
      },
    })?.supportingLines).toEqual([
      '工作流：显形轨迹',
      '历史转移：历史转移 900 -> 1100。',
      '事件定位：事件 event-person-state。',
    ])
  })
})
