import { formatSelfEvolutionWorkflowSideLabel } from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionFocusHistoryPatternContext {
  currentCapturedAt: number
  previousCapturedAt: number
  side: 'current' | 'previous'
  summaryLine: string
}

interface SelfEvolutionRepairSession {
  completionPercent: number
  completedCount: number
  totalCount: number
  completedChecklist: string[]
  remainingChecklist: string[]
  summaryLines: string[]
}

interface SelfEvolutionFocusSnapshotLike {
  capturedAt: number
}

interface SelfEvolutionFocusHistoryPatternLike {
  patternKey: string
  occurrenceCount: number
}

export function buildSelfEvolutionRepairClosure(input: {
  activePatternKey: string | null
  activePatternContext: SelfEvolutionFocusHistoryPatternContext | null
  repairSession: SelfEvolutionRepairSession | null
  latestSnapshot: SelfEvolutionFocusSnapshotLike | null
  latestPatterns: SelfEvolutionFocusHistoryPatternLike[]
}) {
  if (!input.activePatternKey || !input.activePatternContext || !input.repairSession)
    return null

  const targetCapturedAt = input.activePatternContext.side === 'current'
    ? input.activePatternContext.currentCapturedAt
    : input.activePatternContext.previousCapturedAt
  const hasFreshValidationSnapshot = Boolean(input.latestSnapshot && input.latestSnapshot.capturedAt > targetCapturedAt)
  const sessionCovered = input.repairSession.remainingChecklist.length === 0
  const samePatternStillPresent = input.latestPatterns.some(pattern => pattern.patternKey === input.activePatternKey)
  const prosodyAuthorityRelevant = input.repairSession.summaryLines.some(line => line.startsWith('韵律权威：'))
  const continuityGovernanceRelevant = input.repairSession.summaryLines.some(line => line.includes('连续性治理'))
  const prosodyAuthorityValidated = prosodyAuthorityRelevant
    ? sessionCovered && hasFreshValidationSnapshot && !samePatternStillPresent
    : null

  const summaryLines = [
    `修复上下文已还原到目标${formatSelfEvolutionWorkflowSideLabel(input.activePatternContext.side)}。`,
    sessionCovered
      ? '修复检查已全部覆盖。'
      : `修复检查仍未完成（${input.repairSession.completedCount}/${input.repairSession.totalCount}）。`,
    hasFreshValidationSnapshot
      ? '修复后已经存在新的验证快照。'
      : '请在修复后抓取新的验证快照，确认漂移是否收敛。',
    samePatternStillPresent
      ? '同一反复漂移模式仍出现在最近历史中。'
      : '已修复的反复漂移模式不再出现在最近历史中。',
  ]

  if (prosodyAuthorityValidated === true)
    summaryLines.push('韵律权威链已重新绑定到当前片段，可作为采纳基线的一部分。')
  else if (prosodyAuthorityValidated === false)
    summaryLines.push('韵律权威链仍未稳定回到同一片段，不应采纳为长期基线。')

  if (continuityGovernanceRelevant && sessionCovered && hasFreshValidationSnapshot && !samePatternStillPresent)
    summaryLines.push('same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。')

  return {
    isClosed: sessionCovered && hasFreshValidationSnapshot && !samePatternStillPresent && prosodyAuthorityValidated !== false,
    sessionCovered,
    hasFreshValidationSnapshot,
    samePatternStillPresent,
    prosodyAuthorityRelevant,
    prosodyAuthorityValidated,
    summaryLines,
  }
}
