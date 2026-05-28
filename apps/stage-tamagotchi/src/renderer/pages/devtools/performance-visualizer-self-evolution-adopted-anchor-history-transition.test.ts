import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchorHistoryTransition } from './performance-visualizer-self-evolution-adopted-anchor-history-transition'

describe('performance visualizer self evolution adopted anchor history transition', () => {
  it('returns null when there is no adopted anchor or no matching history transition', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: null,
      historyDrilldown: [],
    })).toBeNull()

    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1100,
        decisionTraceId: 'trace-3',
        activePatternKey: 'pattern-renderer',
      },
      historyDrilldown: [
        {
          currentCapturedAt: 900,
          previousCapturedAt: 700,
          currentDecisionTraceId: 'trace-2',
          previousDecisionTraceId: 'trace-1',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: false,
          changedTraceEvent: false,
          lines: ['聚焦卡片：修复路径 -> 修复归属'],
        },
      ],
    })).toBeNull()
  })

  it('locates the history transition that produced the adopted anchor snapshot', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1100,
        decisionTraceId: 'trace-3',
        activePatternKey: 'pattern-renderer',
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1100,
          previousCapturedAt: 900,
          currentDecisionTraceId: 'trace-3',
          previousDecisionTraceId: 'trace-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: false,
          lines: [
            '聚焦卡片：修复路径 -> 修复归属',
            '证据面板：运行时连续性投影 => 显形权威投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1100:900',
      currentCapturedAt: 1100,
      previousCapturedAt: 900,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 900 -> 1100 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-3。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
      ],
    })
  })

  it('preserves same-her continuity wording when the adopted anchor came from continuity governance', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1320,
        decisionTraceId: 'trace-governance-3',
        activePatternKey: 'pattern-same-her-governance',
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1320,
          previousCapturedAt: 1180,
          currentDecisionTraceId: 'trace-governance-3',
          previousDecisionTraceId: 'trace-governance-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：候选轨迹摘要 => 身份漂移治理摘要',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1320:1180',
      currentCapturedAt: 1320,
      previousCapturedAt: 1180,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1180 -> 1320 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-governance-3。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是同一个她连续性治理，而不是把记忆先行的熟悉感当成待修漂移。',
      ],
    })
  })
})
