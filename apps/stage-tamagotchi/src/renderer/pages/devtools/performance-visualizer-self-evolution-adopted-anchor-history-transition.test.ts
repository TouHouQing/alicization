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
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
      ],
    })
  })

  it('matches an ordinary structured continuity transition without governance prose', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1320,
        decisionTraceId: 'trace-proactive-action-3',
        activePatternKey: 'pattern-proactive-action-chain',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: null,
      },
      historyDrilldown: [
        {
          currentCapturedAt: 1320,
          previousCapturedAt: 1180,
          currentDecisionTraceId: 'trace-proactive-action-3',
          previousDecisionTraceId: 'trace-proactive-action-2',
          changedFocusCard: true,
          changedEvidenceTargets: true,
          changedTraceTargets: true,
          changedTraceEvent: true,
          lines: [
            '聚焦卡片：修复归属 -> 首查点',
            '证据面板：运行时连续性投影 => proactive-action-chain',
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
        '这次转移生成了被采纳的默认基线快照，并继续沿用轨迹 trace-proactive-action-3。',
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
      ],
    })
  })

  it('uses the structured body-carried rejoin phase and Live2D surface', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1620,
        decisionTraceId: 'trace-body-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        survivingVisibleLane: null,
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
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        expect.stringMatching(/身体线.*Live2D/u),
      ],
    })
  })

  it('uses the structured body-only-hold phase', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1760,
        decisionTraceId: 'trace-body-only-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: null,
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
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        expect.stringMatching(/身体线.*living segment/u),
      ],
    })
  })

  it('keeps the renderer rejoin surface unknown when only the body phase is known', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1690,
        decisionTraceId: 'trace-body-generic-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: null,
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
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        expect.stringMatching(/^((?!speech).)*显形权威/u),
      ],
    })
  })

  it('uses the structured full-cross-modal-lock phase and VRM surface', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1820,
        decisionTraceId: 'trace-body-lock-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        survivingVisibleLane: null,
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
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        expect.stringMatching(/身体线.*VRM.*living segment/u),
      ],
    })
  })

  it('uses the structured renderer-rejoin-without-body phase and speech surface', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1880,
        decisionTraceId: 'trace-body-loss-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: null,
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
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        expect.stringMatching(/speech.*身体线/u),
      ],
    })
  })

  it('keeps the cross-modal-lock surface unknown without inferring speech', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1820,
        decisionTraceId: 'trace-body-lock-generic-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: null,
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
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        expect.stringMatching(/^((?!speech).)*显形权威/u),
      ],
    })
  })

  it('keeps the renderer-rejoin-without-body surface unknown without inferring speech', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1880,
        decisionTraceId: 'trace-body-loss-generic-3',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: null,
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
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        expect.stringMatching(/^((?!speech).)*显形权威/u),
      ],
    })
  })

  it('preserves a structured surviving visible lane', () => {
    expect(buildSelfEvolutionAdoptedAnchorHistoryTransition({
      adoptedAnchor: {
        snapshotCapturedAt: 1905,
        decisionTraceId: 'trace-face-voice-only-4',
        activePatternKey: 'pattern-body-continuity-governance',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
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
        '如果需要验证连续性，应优先回看这次前后转移，而不是只看静态锚点结果。',
        expect.stringContaining('表情、口型、声音'),
      ],
    })
  })
})
