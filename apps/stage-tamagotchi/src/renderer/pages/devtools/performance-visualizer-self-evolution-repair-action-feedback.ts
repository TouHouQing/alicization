import {
  formatSelfEvolutionRepairActionLabel,
  formatSelfEvolutionRepairSurfaceLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionRepairNextActionLike {
  kind: string
  label: string
  detail: string
  targetType: 'evidence' | 'trace' | 'event' | 'snapshot'
  targetId: string
}

interface SelfEvolutionRepairFollowupNavigationLike {
  activeSurfaceKey: string
  scrollTargetId: string | null
}

interface SelfEvolutionRepairClosureLike {
  isClosed: boolean
  sessionCovered: boolean
  hasFreshValidationSnapshot: boolean
  samePatternStillPresent: boolean
  summaryLines: string[]
}

import { buildSelfEvolutionRepairOutcome } from './performance-visualizer-self-evolution-repair-outcome'

export function buildSelfEvolutionRepairActionFeedback(input: {
  executedAction: SelfEvolutionRepairNextActionLike | null
  followupNavigation: SelfEvolutionRepairFollowupNavigationLike | null
  repairClosureBefore: SelfEvolutionRepairClosureLike | null
  repairClosureAfter: SelfEvolutionRepairClosureLike | null
  snapshotCountBefore: number
  snapshotCountAfter: number
}) {
  if (!input.executedAction)
    return null

  const snapshotCountIncreased = input.snapshotCountAfter > input.snapshotCountBefore
  const closureJustClosed = !input.repairClosureBefore?.isClosed && Boolean(input.repairClosureAfter?.isClosed)
  const repairOutcome = buildSelfEvolutionRepairOutcome({
    repairClosureBefore: input.repairClosureBefore,
    repairClosureAfter: input.repairClosureAfter,
  })

  if (closureJustClosed) {
    const continuityGovernanceConfirmed = input.repairClosureAfter?.summaryLines.some(line =>
      line.includes('same-her 连续性治理已经被新的验证快照再次确认'),
    )
    return {
      tone: 'success',
      summaryLine: continuityGovernanceConfirmed ? 'same-her 连续性闭环已确认。' : '修复闭环已关闭。',
      detailLine: continuityGovernanceConfirmed
        ? '这次连续性治理已经再次得到验证。下一步请抓取新的基线快照，让后续连续性会话从这次确认后的同一个她状态重新开始。'
        : `${repairOutcome?.detailLine ?? '这条反复漂移工作流的修复关闭条件已经全部满足。'}下一步请抓取新的基线快照。`,
    }
  }

  if (input.executedAction.targetType === 'snapshot' && snapshotCountIncreased) {
    const unresolvedSuffix = repairOutcome?.unresolvedSignals.length
      ? '修复闭环仍然打开，直到剩余连续性条件被清除。'
      : ''
    return {
      tone: 'progress',
      summaryLine: input.executedAction.targetId === 'baseline'
        ? '新的基线快照已抓取。'
        : '验证快照已抓取。',
      detailLine: repairOutcome?.improvedSignals.includes('fresh validation snapshot now exists')
        ? `新的快照已经加入，且验证快照现已存在。${unresolvedSuffix || '现在可以继续判断剩余连续性条件是否也已经收敛。'}`
        : input.repairClosureAfter?.isClosed
            ? '修复闭环现已关闭。请把这张快照当作修复后的新连续性参考。'
            : '新的快照已经加入，但修复闭环仍然打开，还需要继续做连续性检查。',
    }
  }

  if (input.followupNavigation?.activeSurfaceKey) {
    return {
      tone: 'progress',
      summaryLine: `已推进到下一项修复目标：${formatSelfEvolutionRepairSurfaceLabel({
        targetType: input.followupNavigation.activeSurfaceKey.split(':')[0] as 'evidence' | 'trace' | 'event' | 'snapshot',
        targetId: input.followupNavigation.activeSurfaceKey.split(':').slice(1).join(':'),
      })}。`,
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项连续性检查目标。',
    }
  }

  return {
    tone: 'progress',
    summaryLine: `修复动作已完成：${formatSelfEvolutionRepairActionLabel({
      label: input.executedAction.label,
      targetType: input.executedAction.targetType,
      targetId: input.executedAction.targetId,
    })}。`,
    detailLine: '工作台暂时还没有识别出更新的后续目标，请继续验证当前连续性界面。',
  }
}
