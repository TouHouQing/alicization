interface SelfEvolutionFocusSnapshotLike {
  version: string
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path'
  explanation: string | null
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  capturedAt: number
}

interface SelfEvolutionRepairOutcomeLike {
  closureChanged: boolean
  improvedSignals: string[]
  unresolvedSignals: string[]
  summaryLine: string
  detailLine: string
}

interface SelfEvolutionRepairClosureLike {
  isClosed: boolean
  sessionCovered: boolean
  hasFreshValidationSnapshot: boolean
  samePatternStillPresent: boolean
  prosodyAuthorityRelevant: boolean
  prosodyAuthorityValidated: boolean | null
  summaryLines: string[]
}

function formatSelfEvolutionBaselineSignal(signal: string) {
  return signal
    .replace('repair checklist is now fully covered', '修复检查现已全部覆盖')
    .replace('fresh validation snapshot now exists', '新的验证快照现已存在')
    .replace('same recurring drift pattern cleared from recent history', '同一反复漂移模式已从最近历史中消失')
    .replace('repair checklist not fully covered', '修复检查尚未全部覆盖')
    .replace('fresh validation snapshot missing', '新的验证快照仍然缺失')
    .replace('same recurring drift pattern still present', '同一反复漂移模式仍然存在')
}

function buildProsodyAuthorityBaselineLines(repairClosure: SelfEvolutionRepairClosureLike) {
  if (!repairClosure.prosodyAuthorityRelevant)
    return []

  if (repairClosure.prosodyAuthorityValidated)
    return ['韵律权威链已重新绑定到当前片段，可作为采纳基线的一部分。']

  return ['韵律权威链仍未稳定回到同一片段，不应采纳为长期基线。']
}

function buildContinuityGovernanceBaselineLines(repairClosure: SelfEvolutionRepairClosureLike) {
  return repairClosure.summaryLines.includes('same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。')
    ? ['same-her 连续性治理已经被新的验证快照再次确认，可作为长期基线的一部分。']
    : []
}

export function buildSelfEvolutionBaselineQuality(input: {
  latestSnapshot: SelfEvolutionFocusSnapshotLike | null
  history: SelfEvolutionFocusSnapshotLike[]
  repairOutcome: SelfEvolutionRepairOutcomeLike | null
  repairClosure: SelfEvolutionRepairClosureLike | null
}) {
  if (!input.latestSnapshot || !input.repairOutcome || !input.repairClosure)
    return null

  const latestSnapshotKey = [
    input.latestSnapshot.capturedAt,
    input.latestSnapshot.candidateId,
    input.latestSnapshot.decisionTraceId,
    input.latestSnapshot.selectedCardId,
    input.latestSnapshot.recommendedTraceEventId,
  ].join(':')
  let skippedLatestMatch = false
  const previousAnchor = [...input.history]
    .sort((left, right) => right.capturedAt - left.capturedAt)
    .find((snapshot) => {
      const snapshotKey = [
        snapshot.capturedAt,
        snapshot.candidateId,
        snapshot.decisionTraceId,
        snapshot.selectedCardId,
        snapshot.recommendedTraceEventId,
      ].join(':')
      if (!skippedLatestMatch && snapshotKey === latestSnapshotKey) {
        skippedLatestMatch = true
        return false
      }
      return true
    }) ?? null
  const previousAnchorCapturedAt = previousAnchor?.capturedAt ?? null
  const isNewerThanPreviousAnchor = previousAnchorCapturedAt === null
    ? true
    : input.latestSnapshot.capturedAt > previousAnchorCapturedAt

  if (!isNewerThanPreviousAnchor) {
    return {
      verdict: 'stale',
      summaryLine: '这张基线已经过期，在信任它之前应重新抓取。',
      detailLine: '最新快照没有越过上一张连续性锚点，因此它还不足以充当下一张基线。',
      supportingLines: [
        `最新快照时间 ${input.latestSnapshot.capturedAt} 并不晚于上一张锚点 ${previousAnchorCapturedAt}。`,
        '请先抓取新的修复后快照，再替换连续性锚点。',
      ],
    }
  }

  if (input.repairClosure.isClosed && input.repairOutcome.unresolvedSignals.length === 0) {
    return {
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        `最新快照时间 ${input.latestSnapshot.capturedAt} 晚于上一张锚点 ${previousAnchorCapturedAt ?? 'n/a'}。`,
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        ...buildProsodyAuthorityBaselineLines(input.repairClosure),
        ...buildContinuityGovernanceBaselineLines(input.repairClosure),
      ],
    }
  }

  const unresolvedSignals = input.repairOutcome.unresolvedSignals.map(formatSelfEvolutionBaselineSignal)
  if (
    unresolvedSignals.length === 0
    && input.repairClosure.prosodyAuthorityRelevant
    && input.repairClosure.prosodyAuthorityValidated === false
  ) {
    unresolvedSignals.push('无，但韵律权威链仍未稳定回到同一片段')
  }

  return {
    verdict: 'provisional',
    summaryLine: '这张基线目前只能算暂定，还不应该替换连续性锚点。',
    detailLine: '虽然最新快照更晚，但在把它当作长期基线之前，仍然存在尚未解决的修复信号。',
    supportingLines: [
      `最新快照时间 ${input.latestSnapshot.capturedAt} 晚于上一张锚点 ${previousAnchorCapturedAt ?? 'n/a'}。`,
      `尚未解决的连续性信号：${unresolvedSignals.join('；')}。`,
      ...buildProsodyAuthorityBaselineLines(input.repairClosure),
      ...buildContinuityGovernanceBaselineLines(input.repairClosure),
    ],
  }
}
