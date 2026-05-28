import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchorReplayFeedback } from './performance-visualizer-self-evolution-adopted-anchor-replay-feedback'

describe('performance visualizer self evolution adopted anchor replay feedback', () => {
  it('returns null when there is no replay plan', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback(null)).toBeNull()
  })

  it('summarizes the replay result in an auditable human-readable format', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
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
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点回放已完成。',
      detailLine: '工作流 pattern-renderer、历史转移 1100:900、对比侧 current 和事件 event-person-state 已同步恢复。',
      supportingLines: [
        '工作流：3 次反复转移共享同一显形权威漂移特征。',
        '历史转移：当前默认连续性锚点对应 900 -> 1100 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-person-state。',
      ],
    })
  })

  it('keeps same-her continuity governance visible in replay feedback after restoring an adopted governance anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
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
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点回放已完成。',
      detailLine: '工作流 pattern-same-her-governance、历史转移 1320:1180、对比侧 current 和事件 event-governance 已同步恢复。',
      supportingLines: [
        '工作流：2 次反复转移共享同一同一个她连续性漂移特征。',
        '历史转移：当前默认连续性锚点对应 1180 -> 1320 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-governance。',
        '连续性前提：采纳前提仍然可追溯到same-her 连续性治理已经再次确认，可直接进入长期基线，而不是把记忆先行的熟悉感误写成应该被修掉的漂移。',
      ],
    })
  })
})
