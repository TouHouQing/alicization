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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
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

  it('preserves identity-continuity', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1320,
        decisionTraceId: 'trace-governance-3',
        activePatternKey: 'pattern-same-her-governance',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
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

  it('preserves body continuity wording when the adopted anchor came from body-led same-segment carry governance', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1620,
        decisionTraceId: 'trace-body-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1620,
          previousCapturedAt: 1520,
          currentDecisionTraceId: 'trace-body-3',
          previousDecisionTraceId: 'trace-body-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：显形权威投影 => 运行时连续性投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1620:1520',
      currentCapturedAt: 1620,
      previousCapturedAt: 1520,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1520 -> 1620 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-body-3。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是身体连续性治理，应优先确认身体线是否仍托住同一段 living segment，并确认 Live2D 是否沿同一条连续身体线补回显形权威，而不是把这段回收误写成 generic partial drift。',
      ],
    })
  })

  it('preserves body-only-hold wording when the adopted anchor came from a lower-visibility body-led same-segment carry', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1760,
        decisionTraceId: 'trace-body-only-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1760,
          previousCapturedAt: 1700,
          currentDecisionTraceId: 'trace-body-only-3',
          previousDecisionTraceId: 'trace-body-only-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：运行时连续性投影 => 显形权威投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1760:1700',
      currentCapturedAt: 1760,
      previousCapturedAt: 1700,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1700 -> 1760 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-body-only-3。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是身体连续性治理，应优先确认身体线是否仍在独自托住同一段 living segment，而不是把这段低显形延续误写成已经失败或已经完成。',
      ],
    })
  })

  it('does not fabricate a speech rejoin surface when the adopted anchor came from body rejoin but the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1690,
        decisionTraceId: 'trace-body-generic-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1690,
          previousCapturedAt: 1620,
          currentDecisionTraceId: 'trace-body-generic-3',
          previousDecisionTraceId: 'trace-body-generic-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：显形权威投影 => 运行时连续性投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1690:1620',
      currentCapturedAt: 1690,
      previousCapturedAt: 1620,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1620 -> 1690 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-body-generic-3。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是身体连续性治理，应优先确认身体线是否仍托住同一段 living segment，并确认显形权威是否沿同一条连续身体线补回，而不是把这段回收误写成 generic partial drift。',
      ],
    })
  })

  it('preserves full-cross-modal-lock wording when the adopted anchor came from a stable same-segment lock across body and renderer surfaces', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1820,
        decisionTraceId: 'trace-body-lock-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1820,
          previousCapturedAt: 1760,
          currentDecisionTraceId: 'trace-body-lock-3',
          previousDecisionTraceId: 'trace-body-lock-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：显形权威投影 => 运行时连续性投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1820:1760',
      currentCapturedAt: 1820,
      previousCapturedAt: 1760,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1760 -> 1820 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-body-lock-3。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是身体连续性治理，应优先确认身体线与 VRM 是否仍共同锁在同一段 living segment 上，而不是把这段稳定回归误写成短暂同步。',
      ],
    })
  })

  it('preserves renderer-rejoin-without-body wording when the adopted anchor came from visible recovery without same-segment body carry', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1880,
        decisionTraceId: 'trace-body-loss-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1880,
          previousCapturedAt: 1820,
          currentDecisionTraceId: 'trace-body-loss-3',
          previousDecisionTraceId: 'trace-body-loss-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：显形权威投影 => 运行时连续性投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1880:1820',
      currentCapturedAt: 1880,
      previousCapturedAt: 1820,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1820 -> 1880 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-body-loss-3。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是身体连续性治理，应优先确认为什么 speech 已经回接、但身体线没有继续托住同一段 living segment，而不是把这段失身回接误写成可信长期基线。',
      ],
    })
  })

  it('does not fall back to generic body rejoin wording when cross-modal lock is trusted but the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1820,
        decisionTraceId: 'trace-body-lock-generic-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: null,
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1820,
          previousCapturedAt: 1760,
          currentDecisionTraceId: 'trace-body-lock-generic-3',
          previousDecisionTraceId: 'trace-body-lock-generic-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：显形权威投影 => 运行时连续性投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1820:1760',
      currentCapturedAt: 1820,
      previousCapturedAt: 1760,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1760 -> 1820 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-body-lock-generic-3。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是身体连续性治理，应优先确认身体线与显形权威是否仍共同锁在同一段 living segment 上，而不是把这段稳定回归误写成短暂同步。',
      ],
    })
  })

  it('preserves full-cross-modal-lock wording when the governance note is explicit but the adopted anchor is still missing structured phase metadata', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1815,
        decisionTraceId: 'trace-body-lock-generic-note-only-4',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1815,
          previousCapturedAt: 1760,
          currentDecisionTraceId: 'trace-body-lock-generic-note-only-4',
          previousDecisionTraceId: 'trace-body-lock-generic-note-only-3',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：显形权威投影 => 运行时连续性投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1815:1760',
      currentCapturedAt: 1815,
      previousCapturedAt: 1760,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1760 -> 1815 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-body-lock-generic-note-only-4。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是身体连续性治理，应优先确认身体线与显形权威是否仍共同锁在同一段 living segment 上，而不是把这段稳定回归误写成短暂同步。',
      ],
    })
  })

  it('does not fall back to generic body rejoin wording when visible recovery happened without body carry and the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1880,
        decisionTraceId: 'trace-body-loss-generic-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1880,
          previousCapturedAt: 1820,
          currentDecisionTraceId: 'trace-body-loss-generic-3',
          previousDecisionTraceId: 'trace-body-loss-generic-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：显形权威投影 => 运行时连续性投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1880:1820',
      currentCapturedAt: 1880,
      previousCapturedAt: 1820,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1820 -> 1880 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-body-loss-generic-3。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是身体连续性治理，应优先确认为什么显形权威已经回接、但身体线没有继续托住同一段 living segment，而不是把这段失身回接误写成可信长期基线。',
      ],
    })
  })

  it('preserves quieter identity-continuity', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1905,
        decisionTraceId: 'trace-face-voice-only-4',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        bodyContinuityGovernanceNote: '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1905,
          previousCapturedAt: 1880,
          currentDecisionTraceId: 'trace-face-voice-only-4',
          previousDecisionTraceId: 'trace-face-voice-only-3',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：显形权威投影 => 运行时连续性投影',
          ],
        },
      ],
    })).toEqual({
      transitionKey: '1905:1880',
      currentCapturedAt: 1905,
      previousCapturedAt: 1880,
      selectedSide: 'current',
      summaryLine: '当前默认连续性锚点对应 1880 -> 1905 这次历史转移。',
      supportingLines: [
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-face-voice-only-4。',
        '如果需要验证 same-her 连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        '这次历史转移对应的是身体连续性治理，应优先确认当前是否仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，避免把这次 quieter carry 误写成 body、motion 已经补回的修复完成。',
      ],
    })
  })
})
