import type { SelfEvolutionRepairClosureLike as SelfEvolutionRepairOutcomeClosureLike } from './performance-visualizer-self-evolution-repair-outcome'

import {
  formatRendererRejoinSurfaceLabel,
  formatSelfEvolutionRepairActionLabel,
  formatSelfEvolutionRepairSurfaceLabel,
} from './performance-visualizer-self-evolution-focus-history-display'
import {
  buildSelfEvolutionRepairOutcome,

} from './performance-visualizer-self-evolution-repair-outcome'

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

interface SelfEvolutionRepairActionClosureLike {
  isClosed: boolean
  sessionCovered?: boolean
  hasFreshValidationSnapshot?: boolean
  samePatternStillPresent?: boolean
  prosodyAuthorityRelevant?: boolean
  prosodyAuthorityValidated?: boolean | null
  summaryLines: string[]
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}

export interface SelfEvolutionRepairActionFeedback {
  tone: 'success' | 'progress'
  summaryLine: string
  detailLine: string
  supportingLines?: string[]
}

type SelfEvolutionRendererRejoinSurfaceKey
  = 'authority:renderer-rejoin:speech'
    | 'authority:renderer-rejoin:live2d'
    | 'authority:renderer-rejoin:vrm'

function inferBodyContinuityPhaseFromSummaryLines(summaryLines: string[]) {
  const joined = summaryLines.join('\n')
  if (joined.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body' as const
  if (joined.includes('跨模态重锁态'))
    return 'full-cross-modal-lock' as const
  if (
    joined.includes('身体独撑态')
    || joined.includes('独自托住同一段 living segment')
  ) {
    return 'body-only-hold' as const
  }
  if (
    joined.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
    || joined.includes('同一条连续身体线')
    || joined.includes('authority-body:yes')
  ) {
    return 'body-carried-to-renderer-rejoin' as const
  }
  return null
}

function resolveRendererRejoinSurface(lines: string[]) {
  for (const line of lines) {
    const match = line.match(
      /(?:身体承接态 -> 显形补回态|跨模态重锁态|显形回接失身态)（(Live2D|VRM|speech)(?: authority rejoin| authority lock| authority rejoin without same-segment body carry)?）/,
    )
    if (match)
      return match[1]
  }
  return null
}

function resolveRendererRejoinSurfaceFromClosure(closure: SelfEvolutionRepairActionClosureLike | null | undefined) {
  if (closure?.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'
  if (closure?.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'
  if (closure?.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'
  return resolveRendererRejoinSurface(closure?.summaryLines ?? [])
}

function formatSelfEvolutionRepairFollowupSurfaceLabel(input: {
  activeSurfaceKey: string
  projectStateContinuity: boolean
}) {
  if (input.activeSurfaceKey.startsWith('authority:renderer-rejoin:')) {
    return `显形补回层 / ${formatRendererRejoinSurfaceLabel(
      input.activeSurfaceKey as SelfEvolutionRendererRejoinSurfaceKey,
    )}`
  }

  const [targetType, ...targetIdParts] = input.activeSurfaceKey.split(':')
  const targetId = targetIdParts.join(':')

  if (
    targetType === 'evidence'
    || targetType === 'trace'
    || targetType === 'event'
    || targetType === 'snapshot'
  ) {
    return formatSelfEvolutionRepairSurfaceLabel({
      targetType,
      targetId,
      projectStateContinuity: input.projectStateContinuity,
    })
  }

  return input.activeSurfaceKey
}

function normalizeRepairOutcomeClosure(
  closure: SelfEvolutionRepairActionClosureLike | null,
): SelfEvolutionRepairOutcomeClosureLike | null {
  if (!closure)
    return null

  return {
    isClosed: closure.isClosed,
    sessionCovered: closure.sessionCovered ?? false,
    hasFreshValidationSnapshot: closure.hasFreshValidationSnapshot ?? false,
    samePatternStillPresent: closure.samePatternStillPresent ?? false,
    prosodyAuthorityRelevant: closure.prosodyAuthorityRelevant ?? false,
    prosodyAuthorityValidated: closure.prosodyAuthorityValidated ?? null,
    summaryLines: closure.summaryLines,
    bodyContinuityPhase: closure.bodyContinuityPhase,
    rendererRejoinSurfaceKey: closure.rendererRejoinSurfaceKey,
    survivingVisibleLane: closure.survivingVisibleLane,
  }
}

export function buildSelfEvolutionRepairActionFeedback(input: {
  executedAction: SelfEvolutionRepairNextActionLike | null
  followupNavigation: SelfEvolutionRepairFollowupNavigationLike | null
  repairClosureBefore: SelfEvolutionRepairActionClosureLike | null
  repairClosureAfter: SelfEvolutionRepairActionClosureLike | null
  snapshotCountBefore: number
  snapshotCountAfter: number
}): SelfEvolutionRepairActionFeedback | null {
  if (!input.executedAction)
    return null

  const snapshotCountIncreased = input.snapshotCountAfter > input.snapshotCountBefore
  const closureJustClosed = !input.repairClosureBefore?.isClosed && Boolean(input.repairClosureAfter?.isClosed)
  const repairOutcome = buildSelfEvolutionRepairOutcome({
    repairClosureBefore: normalizeRepairOutcomeClosure(input.repairClosureBefore),
    repairClosureAfter: normalizeRepairOutcomeClosure(input.repairClosureAfter),
  })
  const bodyRejoinPhaseActive = input.repairClosureAfter?.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
  const bodyLedContinuityRelevant = [
    input.executedAction.detail,
    ...input.repairClosureAfter?.summaryLines ?? [],
  ].some(line =>
    line.includes('身体连续性：')
    || line.includes('body-led same-her continuity')
    || line.includes('body-led partial recovery')
    || line.includes('authority-body:yes')
    || line.includes('身体线已经先把这段 living segment 托住'),
  ) || bodyRejoinPhaseActive
  const projectStateContinuityRelevant = [
    input.executedAction.detail,
    ...input.repairClosureAfter?.summaryLines ?? [],
  ].some(line =>
    line.includes('项目状态连续性')
    || line.includes('project-state continuity')
    || line.includes('项目身份')
    || line.includes('Phase 1')
    || line.includes('未闭环任务承接'),
  )

  if (closureJustClosed) {
    const resolvedBodyContinuityPhase = input.repairClosureAfter?.bodyContinuityPhase
      ?? inferBodyContinuityPhaseFromSummaryLines(input.repairClosureAfter?.summaryLines ?? [])
    const projectStateContinuityConfirmed = input.repairClosureAfter?.summaryLines.some(line =>
      line.includes('项目状态连续性治理已经被新的验证快照再次确认'),
    )
    const continuityGovernanceConfirmed = input.repairClosureAfter?.summaryLines.some(line =>
      line.includes('same-her 连续性治理已经被新的验证快照再次确认'),
    )
    const bodyLedContinuityConfirmed = bodyLedContinuityRelevant
      && (
        bodyRejoinPhaseActive
        || input.repairClosureAfter?.summaryLines.some(line =>
          line.includes('身体线已经先把这段 living segment 托住')
          || line.includes('同一条连续身体线')
          || line.includes('authority-body:yes')
          || line.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
          || line.includes('Body continuity still carries the same living segment while'),
        )
      )
    const rendererRejoinSurface = resolveRendererRejoinSurfaceFromClosure(input.repairClosureAfter)
    const phaseAwareBodyContinuityClosure = repairOutcome && (
      resolvedBodyContinuityPhase === 'body-only-hold'
      || resolvedBodyContinuityPhase === 'full-cross-modal-lock'
      || resolvedBodyContinuityPhase === 'renderer-rejoin-without-body'
    )
      ? {
          summaryLine: repairOutcome.summaryLine,
          detailLine: `${repairOutcome.detailLine}下一步请抓取新的基线快照。`,
        }
      : null
    return {
      tone: 'success',
      summaryLine: bodyLedContinuityConfirmed
        ? rendererRejoinSurface
          ? `身体承接态 -> ${rendererRejoinSurface} 显形补回闭环已确认。`
          : '身体连续性闭环已确认。'
        : phaseAwareBodyContinuityClosure
          ? phaseAwareBodyContinuityClosure.summaryLine
          : projectStateContinuityConfirmed
            ? '项目状态连续性闭环已确认。'
            : continuityGovernanceConfirmed
              ? 'same-her 连续性闭环已确认。'
              : '修复闭环已关闭。',
      detailLine: bodyLedContinuityConfirmed
        ? rendererRejoinSurface
          ? `这次身体连续性已经再次得到验证，${rendererRejoinSurface} authority 已沿同一条连续身体线补回。下一步请抓取新的基线快照，让后续连续性会话从这次已经确认的同一段 living segment 显形回归重新开始。`
          : '这次身体连续性已经再次得到验证。下一步请抓取新的基线快照，让后续连续性会话从这次已经确认由身体线托住的同一段 living segment 重新开始。'
        : phaseAwareBodyContinuityClosure
          ? phaseAwareBodyContinuityClosure.detailLine
          : projectStateContinuityConfirmed
            ? '这次项目状态连续性治理已经再次得到验证。下一步请抓取新的基线快照，让后续连续性会话从这次确认后的项目身份、Phase 1 主线和未闭环任务承接重新开始。'
            : continuityGovernanceConfirmed
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
    const rendererRejoinSurface = bodyLedContinuityRelevant
      ? resolveRendererRejoinSurfaceFromClosure(input.repairClosureAfter)
      : null
    return {
      tone: 'progress',
      summaryLine: `已推进到下一项修复目标：${formatSelfEvolutionRepairFollowupSurfaceLabel({
        activeSurfaceKey: input.followupNavigation.activeSurfaceKey,
        projectStateContinuity: projectStateContinuityRelevant,
      })}。`,
      detailLine: projectStateContinuityRelevant
        ? '请求的修复动作已经完成，工作台已推进到下一项项目状态连续性检查目标，继续确认项目身份、Phase 1 主线与未闭环任务承接是否仍被同一个她稳定带着。'
        : bodyLedContinuityRelevant
          ? rendererRejoinSurface
            ? `请求的修复动作已经完成，工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断 ${rendererRejoinSurface} 显形权威是否已经补回同一条连续身体线。`
            : '请求的修复动作已经完成，工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断显形权威是否已经补回同一条连续身体线。'
          : '请求的修复动作已经完成，工作台已推进到下一项连续性检查目标。',
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
