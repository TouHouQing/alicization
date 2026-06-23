interface SelfEvolutionRepairClosureLike {
  isClosed: boolean
  sessionCovered?: boolean
  hasFreshValidationSnapshot?: boolean
  samePatternStillPresent?: boolean
  prosodyAuthorityRelevant?: boolean
  prosodyAuthorityValidated?: boolean | null
  summaryLines: string[]
}

function formatSelfEvolutionRepairOutcomeSignal(signal: string) {
  return signal
    .replace('repair checklist is now fully covered', '修复检查现已全部覆盖')
    .replace('fresh validation snapshot now exists', '新的验证快照现已存在')
    .replace('same recurring drift pattern cleared from recent history', '同一反复漂移模式已从最近历史中消失')
    .replace('repair checklist not fully covered', '修复检查尚未全部覆盖')
    .replace('fresh validation snapshot missing', '新的验证快照仍然缺失')
    .replace('same recurring drift pattern still present', '同一反复漂移模式仍然存在')
    .replace('prosody authority chain reattached to the current segment', '韵律权威链已重新绑定到当前片段')
    .replace('prosody authority chain has not reattached to the current segment', '韵律权威链尚未重新绑定到当前片段')
}

export function buildSelfEvolutionRepairOutcome(input: {
  repairClosureBefore: SelfEvolutionRepairClosureLike | null
  repairClosureAfter: SelfEvolutionRepairClosureLike | null
}) {
  if (!input.repairClosureBefore || !input.repairClosureAfter)
    return null

  const improvedSignals: string[] = []
  const unresolvedSignals: string[] = []

  if (!input.repairClosureBefore.sessionCovered && input.repairClosureAfter.sessionCovered)
    improvedSignals.push('repair checklist is now fully covered')
  if (!input.repairClosureBefore.hasFreshValidationSnapshot && input.repairClosureAfter.hasFreshValidationSnapshot)
    improvedSignals.push('fresh validation snapshot now exists')
  if (input.repairClosureBefore.samePatternStillPresent && !input.repairClosureAfter.samePatternStillPresent)
    improvedSignals.push('same recurring drift pattern cleared from recent history')
  if (
    input.repairClosureAfter.prosodyAuthorityRelevant
    && input.repairClosureBefore.prosodyAuthorityValidated === false
    && input.repairClosureAfter.prosodyAuthorityValidated === true
  ) {
    improvedSignals.push('prosody authority chain reattached to the current segment')
  }

  if (!input.repairClosureAfter.sessionCovered)
    unresolvedSignals.push('repair checklist not fully covered')
  if (!input.repairClosureAfter.hasFreshValidationSnapshot)
    unresolvedSignals.push('fresh validation snapshot missing')
  if (input.repairClosureAfter.samePatternStillPresent)
    unresolvedSignals.push('same recurring drift pattern still present')
  if (input.repairClosureAfter.prosodyAuthorityRelevant && input.repairClosureAfter.prosodyAuthorityValidated === false)
    unresolvedSignals.push('prosody authority chain has not reattached to the current segment')

  const closureChanged = !input.repairClosureBefore.isClosed && input.repairClosureAfter.isClosed
  if (closureChanged) {
    const continuityGovernanceConfirmed = input.repairClosureAfter.summaryLines.some(line =>
      line.includes('same-her 连续性治理已经被新的验证快照再次确认'),
    )
    return {
      closureChanged,
      improvedSignals,
      unresolvedSignals,
      summaryLine: continuityGovernanceConfirmed ? 'same-her 连续性闭环已确认。' : '修复闭环已关闭。',
      detailLine: continuityGovernanceConfirmed
        ? '这次连续性治理已经再次得到验证，remembered familiarity 仍然保持 memory-first，same-her room 与 bounded-growth 继续一致。'
        : '这条反复漂移工作流的修复关闭条件已经全部满足。',
    }
  }

  if (improvedSignals.length > 0) {
    return {
      closureChanged,
      improvedSignals,
      unresolvedSignals,
      summaryLine: '修复证据已经改善，但闭环仍未关闭。',
      detailLine: `已改善：${improvedSignals.map(formatSelfEvolutionRepairOutcomeSignal).join('；')}。仍未解决：${unresolvedSignals.map(formatSelfEvolutionRepairOutcomeSignal).join('；')}。`,
    }
  }

  return {
    closureChanged,
    improvedSignals,
    unresolvedSignals,
    summaryLine: '修复闭环仍然打开，暂时还没有新的连续性增益。',
    detailLine: `仍未解决：${unresolvedSignals.map(formatSelfEvolutionRepairOutcomeSignal).join('；')}。`,
  }
}
