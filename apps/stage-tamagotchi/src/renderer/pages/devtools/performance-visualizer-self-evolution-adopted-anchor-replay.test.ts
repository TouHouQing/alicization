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

  it('preserves same-her continuity wording when replaying an adopted governance anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-same-her-governance',
        patternSummary: '这更像同一个她的连续性治理反复被确认，而不是漂移修复。',
        workflowHeadline: '2 次反复转移共享同一同一个她连续性漂移特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.180Z -> 1970-01-01T00:00:01.320Z 的当前侧。',
        supportingLines: [
          '采纳前提仍然可追溯到same-her 连续性治理已经再次确认，可直接进入长期基线，而不是把记忆先行的熟悉感误写成应该被修掉的漂移。',
        ],
      },
      historyTransition: {
        transitionKey: '1320:1180',
        currentCapturedAt: 1320,
        previousCapturedAt: 1180,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 1180 -> 1320 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-governance',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-governance。',
      },
    })).toEqual({
      patternKey: 'pattern-same-her-governance',
      transitionKey: '1320:1180',
      selectedSide: 'current',
      eventId: 'event-governance',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一同一个她连续性漂移特征。',
        '历史转移：当前默认连续性锚点对应 1180 -> 1320 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-governance。',
        '连续性前提：采纳前提仍然可追溯到same-her 连续性治理已经再次确认，可直接进入长期基线，而不是把记忆先行的熟悉感误写成应该被修掉的漂移。',
      ],
    })
  })
})
