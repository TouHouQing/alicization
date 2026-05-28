import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairActionFeedback } from './performance-visualizer-self-evolution-repair-action-feedback'

describe('performance visualizer self evolution repair action feedback', () => {
  it('returns null when no repair action ran', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: null,
      followupNavigation: null,
      repairClosureBefore: null,
      repairClosureAfter: null,
      snapshotCountBefore: 0,
      snapshotCountAfter: 0,
    })).toBeNull()
  })

  it('reports advancing to the refreshed target after a non-terminal repair action', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-evidence',
        label: 'Inspect runtime-continuity-projection',
        detail: '...',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      followupNavigation: {
        activeSurfaceKey: 'trace:selected-trace-event',
        scrollTargetId: 'self-evolution-trace:selected-trace-event',
      },
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [],
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：轨迹 / 选中轨迹事件。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项连续性检查目标。',
    })
  })

  it('reports validation snapshot capture when snapshot count increases but the loop stays open', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'capture-snapshot',
        label: 'Capture validation snapshot',
        detail: '...',
        targetType: 'snapshot',
        targetId: 'validation',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:validation',
        scrollTargetId: 'self-evolution-snapshot:history',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'progress',
      summaryLine: '验证快照已抓取。',
      detailLine: '新的快照已经加入，且验证快照现已存在。修复闭环仍然打开，直到剩余连续性条件被清除。',
    })
  })

  it('reports repair closure when the action closes the loop', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '...',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [],
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '修复闭环已关闭。',
      detailLine: '这条反复漂移工作流的修复关闭条件已经全部满足。下一步请抓取新的基线快照。',
    })
  })

  it('does not claim validation snapshot capture when the count did not increase', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'capture-snapshot',
        label: 'Capture validation snapshot',
        detail: '...',
        targetType: 'snapshot',
        targetId: 'validation',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:validation',
        scrollTargetId: 'self-evolution-snapshot:history',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：快照 / validation。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项连续性检查目标。',
    })
  })

  it('falls back to the executed action when no follow-up navigation is available', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-trace',
        label: 'Inspect trace-details',
        detail: '...',
        targetType: 'trace',
        targetId: 'trace-details',
      },
      followupNavigation: null,
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [],
      },
      snapshotCountBefore: 1,
      snapshotCountAfter: 1,
    })).toEqual({
      tone: 'progress',
      summaryLine: '修复动作已完成：检查 轨迹细节。',
      detailLine: '工作台暂时还没有识别出更新的后续目标，请继续验证当前连续性界面。',
    })
  })

  it('reports continuity-governance confirmation when a repair action closes the same-her loop', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '...',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: 'same-her 连续性闭环已确认。',
      detailLine: '这次连续性治理已经再次得到验证。下一步请抓取新的基线快照，让后续连续性会话从这次确认后的同一个她状态重新开始。',
    })
  })
})
