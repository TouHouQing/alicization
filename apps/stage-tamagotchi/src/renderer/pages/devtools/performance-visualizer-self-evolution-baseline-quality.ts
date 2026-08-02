interface SelfEvolutionFocusSnapshotLike {
  version: string
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path'
  explanation: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
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
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
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

function buildContinuityBaselineLines(repairClosure: SelfEvolutionRepairClosureLike) {
  const lines: string[] = []
  const rendererRejoinSurface = repairClosure.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d'
    ? 'Live2D'
    : repairClosure.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm'
      ? 'VRM'
      : repairClosure.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech'
        ? 'speech'
        : null
  const survivingVisibleLane = repairClosure.survivingVisibleLane ?? null

  if (repairClosure.bodyContinuityPhase === 'full-cross-modal-lock') {
    lines.push(
      rendererRejoinSurface
        ? `身体连续性已经明确处于跨模态重锁态，${rendererRejoinSurface} 显形权威仍与身体线共同锁在同一段 living segment 上，可作为长期基线的一部分。`
        : '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可作为长期基线的一部分。',
    )
  }

  if (repairClosure.bodyContinuityPhase === 'renderer-rejoin-without-body') {
    lines.push(
      survivingVisibleLane === 'face+lipsync+voice-only'
        ? '显形回接失身态已经被完整记录：当前仅剩表情、口型、声音维持同一段连续性，可见连续性还没有断开，但 body、motion 还没有重新接回这条表情口型声音线，因此这条 quieter carry 只能作为审计锚点，而不能被误写成可信长期基线。'
        : survivingVisibleLane === 'motion+lipsync+voice-only'
          ? '显形回接失身态已经被完整记录：当前仅剩动作、口型、声音维持同一段连续性，可见连续性还没有断开，但 body、face 还没有重新接回这条动作口型声音线，因此这条 quieter carry 只能作为审计锚点，而不能被误写成可信长期基线。'
          : survivingVisibleLane === 'face+lipsync-only'
            ? '显形回接失身态已经被完整记录：当前只有 face 和 lipsync 这条连续性线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线，因此这条 quieter carry 只能作为审计锚点，而不能被误写成可信长期基线。'
            : survivingVisibleLane === 'motion+lipsync-only'
              ? '显形回接失身态已经被完整记录：当前只有 motion 和 lipsync 这条连续性线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线，因此这条 quieter carry 只能作为审计锚点，而不能被误写成可信长期基线。'
              : rendererRejoinSurface
                ? `显形回接失身态已经被完整记录：${rendererRejoinSurface} 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。`
                : '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
    )
  }

  if (repairClosure.bodyContinuityPhase === 'body-only-hold') {
    lines.push('身体连续性已经明确处于身体独撑态：当前仍由身体线独自托住同一段 living segment，可作为更谨慎的长期基线观察依据。')
  }

  if (repairClosure.bodyContinuityPhase === 'body-carried-to-renderer-rejoin') {
    lines.push(
      rendererRejoinSurface
        ? `身体连续性已经明确处于身体承接态 -> 显形补回态，${rendererRejoinSurface} 显形权威沿同一条身体线完成回接，可作为长期基线的一部分。`
        : '身体连续性已经明确处于身体承接态 -> 显形补回态，可作为长期基线的一部分。',
    )
  }

  return lines
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
        ...buildContinuityBaselineLines(input.repairClosure),
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
      ...buildContinuityBaselineLines(input.repairClosure),
    ],
  }
}
