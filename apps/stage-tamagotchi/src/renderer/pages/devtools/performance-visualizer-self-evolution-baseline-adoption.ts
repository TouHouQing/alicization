interface SelfEvolutionBaselineQualityLike {
  verdict: 'trusted' | 'provisional' | 'stale'
  summaryLine: string
  detailLine: string
  supportingLines: string[]
}

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

function pickProsodyAuthorityNote(supportingLines: string[]) {
  return supportingLines.find(line => line.includes('韵律权威链'))
}

function pickContinuityGovernanceNote(supportingLines: string[]) {
  return supportingLines.find(line => line.includes('same-her 连续性治理已经被新的验证快照再次确认'))
}

export function buildSelfEvolutionBaselineAdoption(input: {
  baselineQuality: SelfEvolutionBaselineQualityLike | null
  latestSnapshot: SelfEvolutionFocusSnapshotLike | null
  history: SelfEvolutionFocusSnapshotLike[]
}) {
  if (!input.baselineQuality || !input.latestSnapshot)
    return null

  if (input.baselineQuality.verdict === 'stale') {
    return {
      mode: 'reject',
      summaryLine: '不要采纳这张基线，先重新抓取新的修复后快照。',
      detailLine: '这张基线已经失效，直接采纳只会把旧锚点误当成新的连续性参照。',
      supportingLines: [
        '当前基线质量 verdict 为 stale。',
        '必须先产生一张真正更新的修复后快照。',
      ],
    }
  }

  if (input.baselineQuality.verdict === 'provisional') {
    const prosodyAuthorityNote = pickProsodyAuthorityNote(input.baselineQuality.supportingLines)
    const continuityGovernanceNote = pickContinuityGovernanceNote(input.baselineQuality.supportingLines)
    return {
      mode: 'observe',
      summaryLine: '先不要采纳这张基线，继续观察下一次连续性转移。',
      detailLine: '它目前只能算暂定基线，应该继续留在观察窗口里，而不是马上升级为默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 provisional。',
        '下一次 recurring-drift 转移仍需要验证它是否稳定。',
        ...(prosodyAuthorityNote ? ['韵律权威链尚未回到当前片段，因此不能进入长期基线。'] : []),
        ...(continuityGovernanceNote ? ['same-her 连续性治理虽然再次确认，但仍需继续观察其后续稳定性。'] : []),
      ],
    }
  }

  const latestSnapshotCapturedAt = input.latestSnapshot.capturedAt
  const newestHistoryCapturedAt = [...input.history]
    .sort((left, right) => right.capturedAt - left.capturedAt)[0]
    ?.capturedAt ?? latestSnapshotCapturedAt

  if (latestSnapshotCapturedAt >= newestHistoryCapturedAt) {
    const prosodyAuthorityNote = pickProsodyAuthorityNote(input.baselineQuality.supportingLines)
    const continuityGovernanceNote = pickContinuityGovernanceNote(input.baselineQuality.supportingLines)
    return {
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        ...(prosodyAuthorityNote ? ['韵律权威链已重新绑定到当前片段，可直接进入长期基线。'] : []),
        ...(continuityGovernanceNote ? ['same-her 连续性治理已经再次确认，可直接进入长期基线。'] : []),
      ],
    }
  }

  const prosodyAuthorityNote = pickProsodyAuthorityNote(input.baselineQuality.supportingLines)
  const continuityGovernanceNote = pickContinuityGovernanceNote(input.baselineQuality.supportingLines)
  return {
    mode: 'observe',
    summaryLine: '先保留这张可信基线，但继续观察是否出现更新快照。',
    detailLine: '它已经可信，不过当前还有更新的连续性快照，先不要立刻把它升格为唯一默认参照。',
    supportingLines: [
      '当前基线质量 verdict 为 trusted。',
      '但历史中已经存在更晚的连续性快照。',
      ...(prosodyAuthorityNote ? ['韵律权威链已经就绪；当前仅因存在更新快照而继续观察。'] : []),
      ...(continuityGovernanceNote ? ['same-her 连续性治理已经再次确认；当前仅因存在更新快照而继续观察。'] : []),
    ],
  }
}
