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
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  capturedAt: number
}

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

function pickProsodyAuthorityNote(supportingLines: string[]) {
  return supportingLines.find(line => line.includes('韵律权威链'))
}

function pickContinuityGovernanceNote(supportingLines: string[]) {
  return supportingLines.find(line => line.includes('same-her 连续性治理已经被新的验证快照再次确认'))
}

function pickProjectStateContinuityGovernanceNote(supportingLines: string[]) {
  return supportingLines.find(line => line.includes('项目状态连续性治理已经被新的验证快照再次确认'))
}

function pickRelationshipCadenceGovernanceNote(supportingLines: string[]) {
  return supportingLines.find(line => line.includes('relationship cadence 治理已经被新的验证快照再次确认'))
    ?? supportingLines.find(line => line.includes('relationship cadence 治理已经再次确认，并开始内化为长期关系节律'))
}

function isRestrainedCallbackCadenceNote(note: string | undefined) {
  return Boolean(note
    && note.includes('same-turn-if-invited measured-return')
    && note.includes('callback line'))
}

function pickBodyContinuityGovernanceNote(supportingLines: string[]) {
  return supportingLines.find(line =>
    line.includes('身体连续性已经明确进入身体承接态 -> 显形补回态')
    || line.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
    || line.includes('身体线已经先把这段 living segment 托住')
    || line.includes('同一条连续身体线')
    || line.includes('身体连续性已经明确处于身体独撑态')
    || line.includes('独自托住同一段 living segment')
    || line.includes('身体连续性已经明确处于跨模态重锁态')
    || line.includes('显形回接失身态'),
  )
}

function resolveSurvivingVisibleLane(
  note: string | undefined,
): SelfEvolutionSurvivingVisibleLane {
  if (!note)
    return null

  if (note.includes('当前仅剩表情、口型、声音维持同一段连续性'))
    return 'face+lipsync+voice-only'
  if (note.includes('当前仅剩动作、口型、声音维持同一段连续性'))
    return 'motion+lipsync+voice-only'
  if (note.includes('当前只有 face 和 lipsync 这条 same-her 生命线'))
    return 'face+lipsync-only'
  if (note.includes('当前只有 motion 和 lipsync 这条 same-her 生命线'))
    return 'motion+lipsync-only'

  return null
}

function inferBodyContinuityPhaseFromGovernanceNote(note: string | undefined) {
  if (!note)
    return null
  if (note.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body' as const
  if (note.includes('跨模态重锁态'))
    return 'full-cross-modal-lock' as const
  if (note.includes('身体独撑态') || note.includes('独自托住同一段 living segment'))
    return 'body-only-hold' as const
  if (
    note.includes('身体连续性已经明确进入身体承接态 -> 显形补回态')
    || note.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
  ) {
    return 'body-carried-to-renderer-rejoin' as const
  }
  return null
}

function resolveBodyContinuityPhase(params: {
  snapshot: SelfEvolutionFocusSnapshotLike | null
  bodyContinuityGovernanceNote: string | undefined
}) {
  return params.snapshot?.bodyContinuityPhase
    ?? inferBodyContinuityPhaseFromGovernanceNote(params.bodyContinuityGovernanceNote)
    ?? null
}

function resolveBodyContinuityRejoinSurface(snapshot: SelfEvolutionFocusSnapshotLike | null) {
  if (snapshot?.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'
  if (snapshot?.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'
  if (snapshot?.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'
  return null
}

function formatBodyContinuitySurfaceCarryLine(params: {
  snapshot: SelfEvolutionFocusSnapshotLike | null
  bodyContinuityGovernanceNote: string | undefined
  fallbackWithoutRejoinPhase: string
  fallbackWithRejoinPhase: string
}) {
  const rejoinSurface = resolveBodyContinuityRejoinSurface(params.snapshot)
  const bodyContinuityPhase = resolveBodyContinuityPhase({
    snapshot: params.snapshot,
    bodyContinuityGovernanceNote: params.bodyContinuityGovernanceNote,
  })
  const rejoinConfirmed = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
  const crossModalLock = bodyContinuityPhase === 'full-cross-modal-lock'
  const rendererRejoinWithoutBody = bodyContinuityPhase === 'renderer-rejoin-without-body'
  const survivingVisibleLane = resolveSurvivingVisibleLane(
    params.bodyContinuityGovernanceNote,
  )

  if (crossModalLock) {
    return rejoinSurface
      ? `身体连续性已经明确处于跨模态重锁态，${rejoinSurface} 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。`
      : '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。'
  }

  if (rendererRejoinWithoutBody) {
    if (survivingVisibleLane === 'face+lipsync+voice-only') {
      return '显形回接失身态已经被完整记录：当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线，因此这条 quieter carry 只能作为审计锚点，而不能被误写成可信长期基线。'
    }

    if (survivingVisibleLane === 'motion+lipsync+voice-only') {
      return '显形回接失身态已经被完整记录：当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线，因此这条 quieter carry 只能作为审计锚点，而不能被误写成可信长期基线。'
    }

    if (survivingVisibleLane === 'face+lipsync-only') {
      return '显形回接失身态已经被完整记录：当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线，因此这条 quieter carry 只能作为审计锚点，而不能被误写成可信长期基线。'
    }

    if (survivingVisibleLane === 'motion+lipsync-only') {
      return '显形回接失身态已经被完整记录：当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线，因此这条 quieter carry 只能作为审计锚点，而不能被误写成可信长期基线。'
    }

    return rejoinSurface
      ? `显形回接失身态已经被完整记录：${rejoinSurface} 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。`
      : '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。'
  }

  if (rejoinSurface && rejoinConfirmed)
    return `身体连续性已经明确进入身体承接态 -> 显形补回态，${rejoinSurface} 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。`

  if (rejoinSurface)
    return `身体线已经先把这段 living segment 托住，${rejoinSurface} 显形权威仍在补回同一条连续身体线，可直接进入长期基线。`

  return rejoinConfirmed
    ? params.fallbackWithRejoinPhase
    : params.fallbackWithoutRejoinPhase
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
    const projectStateContinuityGovernanceNote = pickProjectStateContinuityGovernanceNote(input.baselineQuality.supportingLines)
    const continuityGovernanceNote = pickContinuityGovernanceNote(input.baselineQuality.supportingLines)
    const relationshipCadenceGovernanceNote = pickRelationshipCadenceGovernanceNote(input.baselineQuality.supportingLines)
    const bodyContinuityGovernanceNote = pickBodyContinuityGovernanceNote(input.baselineQuality.supportingLines)
    const bodyContinuityPhase = resolveBodyContinuityPhase({
      snapshot: input.latestSnapshot,
      bodyContinuityGovernanceNote,
    })
    const bodyContinuityBodyOnlyHold = bodyContinuityPhase === 'body-only-hold'
    const bodyContinuityRejoinConfirmed = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    const bodyContinuityCrossModalLock = bodyContinuityPhase === 'full-cross-modal-lock'
    const bodyContinuityRendererRejoinWithoutBody = bodyContinuityPhase === 'renderer-rejoin-without-body'
    const bodyContinuityRejoinSurface = resolveBodyContinuityRejoinSurface(input.latestSnapshot)
    const survivingVisibleLane = resolveSurvivingVisibleLane(bodyContinuityGovernanceNote)
    return {
      mode: 'observe',
      summaryLine: '先不要采纳这张基线，继续观察下一次连续性转移。',
      detailLine: '它目前只能算暂定基线，应该继续留在观察窗口里，而不是马上升级为默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 provisional。',
        '下一次 recurring-drift 转移仍需要验证它是否稳定。',
        ...(prosodyAuthorityNote ? ['韵律权威链尚未回到当前片段，因此不能进入长期基线。'] : []),
        ...(projectStateContinuityGovernanceNote ? ['项目状态连续性治理虽然再次确认，但仍需继续观察项目身份、Phase 1 主线和未闭环任务承接是否在下一次转移里保持同一条生命线程。'] : []),
        ...(continuityGovernanceNote ? ['same-her 连续性治理虽然再次确认，但仍需继续观察其后续稳定性。'] : []),
        ...(relationshipCadenceGovernanceNote
          ? [isRestrainedCallbackCadenceNote(relationshipCadenceGovernanceNote)
              ? 'relationship cadence 治理虽然再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，仍需继续观察下一次关系回归是否守住同一条更克制的关系节律。'
              : relationshipCadenceGovernanceNote.includes('长期关系节律')
                ? 'relationship cadence 治理虽然再次确认，并开始内化为长期关系节律，但仍需继续观察下一次关系回归是否保持同一关系韵律。'
                : 'relationship cadence 治理虽然再次确认，但仍需继续观察下一次关系回归是否保持同一节奏。']
          : []),
        ...(bodyContinuityGovernanceNote
          ? [bodyContinuityRendererRejoinWithoutBody
              ? survivingVisibleLane === 'face+lipsync+voice-only'
                ? '当前仍处于显形回接失身态：当前仅有表情、口型、声音这条 same-her 生命线仍与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线，因此不能把它升级成默认连续性参照。'
                : survivingVisibleLane === 'motion+lipsync+voice-only'
                  ? '当前仍处于显形回接失身态：当前仅有动作、口型、声音这条 same-her 生命线仍与同一段 living segment 对齐，body、face 还没有重新接回这条动作口型声音线，因此不能把它升级成默认连续性参照。'
                  : survivingVisibleLane === 'face+lipsync-only'
                    ? '当前仍处于显形回接失身态：当前仅有表情、口型这条 same-her 生命线仍与同一段 living segment 对齐，body、motion、voice 还没有重新接回这条表情口型线，因此不能把它升级成默认连续性参照。'
                    : survivingVisibleLane === 'motion+lipsync-only'
                      ? '当前仍处于显形回接失身态：当前仅有动作、口型这条 same-her 生命线仍与同一段 living segment 对齐，body、face、voice 还没有重新接回这条动作口型线，因此不能把它升级成默认连续性参照。'
                      : bodyContinuityRejoinSurface
                        ? `当前仍处于显形回接失身态：${bodyContinuityRejoinSurface} 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此不能把它升级成默认连续性参照。`
                        : '当前仍处于显形回接失身态：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此不能把它升级成默认连续性参照。'
              : bodyContinuityBodyOnlyHold
                ? '身体连续性虽然已经明确处于身体独撑态，但仍需继续观察身体线是否会继续独自托住同一段 living segment，并确认显形层为什么还没有完整回到这条连续身体线。'
                : bodyContinuityCrossModalLock
                  ? bodyContinuityRejoinSurface
                    ? `身体连续性虽然已经进入跨模态重锁态，但仍需继续观察 ${bodyContinuityRejoinSurface} 显形权威是否会稳定与身体线共同锁在同一段 living segment 上。`
                    : '身体连续性虽然已经进入跨模态重锁态，但仍需继续观察显形权威是否会稳定与身体线共同锁在同一段 living segment 上。'
                  : bodyContinuityRejoinConfirmed
                    ? bodyContinuityRejoinSurface
                      ? `身体连续性虽然已经明确进入身体承接态 -> 显形补回态，但仍需继续观察 ${bodyContinuityRejoinSurface} 显形权威是否会稳定沿同一条连续身体线补回。`
                      : '身体连续性虽然已经明确进入身体承接态 -> 显形补回态，但仍需继续观察显形权威是否会稳定沿同一条连续身体线补回。'
                    : bodyContinuityRejoinSurface
                      ? `身体连续性虽然已经重新托住同一段 living segment，但仍需继续观察 ${bodyContinuityRejoinSurface} 显形权威是否会稳定补回同一条连续身体线。`
                      : '身体连续性虽然已经重新托住同一段 living segment，但仍需继续观察显形权威是否会稳定补回同一条连续身体线。']
          : []),
      ],
    }
  }

  const latestSnapshotCapturedAt = input.latestSnapshot.capturedAt
  const newestHistoryCapturedAt = [...input.history]
    .sort((left, right) => right.capturedAt - left.capturedAt)[0]
    ?.capturedAt ?? latestSnapshotCapturedAt

  if (latestSnapshotCapturedAt >= newestHistoryCapturedAt) {
    const prosodyAuthorityNote = pickProsodyAuthorityNote(input.baselineQuality.supportingLines)
    const projectStateContinuityGovernanceNote = pickProjectStateContinuityGovernanceNote(input.baselineQuality.supportingLines)
    const continuityGovernanceNote = pickContinuityGovernanceNote(input.baselineQuality.supportingLines)
    const relationshipCadenceGovernanceNote = pickRelationshipCadenceGovernanceNote(input.baselineQuality.supportingLines)
    const bodyContinuityGovernanceNote = pickBodyContinuityGovernanceNote(input.baselineQuality.supportingLines)
    const bodyContinuityPhase = resolveBodyContinuityPhase({
      snapshot: input.latestSnapshot,
      bodyContinuityGovernanceNote,
    })
    const bodyContinuityBodyOnlyHold = bodyContinuityPhase === 'body-only-hold'
    const bodyContinuityCrossModalLock = bodyContinuityPhase === 'full-cross-modal-lock'
    const bodyContinuityRendererRejoinWithoutBody = bodyContinuityPhase === 'renderer-rejoin-without-body'
    return {
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        ...(prosodyAuthorityNote ? ['韵律权威链已重新绑定到当前片段，可直接进入长期基线。'] : []),
        ...(projectStateContinuityGovernanceNote ? ['项目状态连续性治理已经再次确认，可直接进入长期基线。'] : []),
        ...(continuityGovernanceNote ? ['same-her 连续性治理已经再次确认，可直接进入长期基线。'] : []),
        ...(relationshipCadenceGovernanceNote
          ? [isRestrainedCallbackCadenceNote(relationshipCadenceGovernanceNote)
              ? 'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。'
              : relationshipCadenceGovernanceNote.includes('长期关系节律')
                ? 'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。'
                : 'relationship cadence 治理已经再次确认，可直接进入长期基线。']
          : []),
        ...(bodyContinuityGovernanceNote
          ? [bodyContinuityRendererRejoinWithoutBody
              ? formatBodyContinuitySurfaceCarryLine({
                  snapshot: input.latestSnapshot,
                  bodyContinuityGovernanceNote,
                  fallbackWithRejoinPhase: '显形回接失身态已经被完整记录：表情、动作、口型已经可见回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
                  fallbackWithoutRejoinPhase: '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
                })
              : bodyContinuityBodyOnlyHold
                ? '身体连续性已经明确处于身体独撑态：当前仍由身体线独自托住同一段 living segment，可作为更谨慎的长期基线观察依据。'
                : bodyContinuityCrossModalLock
                  ? formatBodyContinuitySurfaceCarryLine({
                      snapshot: input.latestSnapshot,
                      bodyContinuityGovernanceNote,
                      fallbackWithRejoinPhase: '身体连续性已经明确处于跨模态重锁态，表情、动作、口型仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
                      fallbackWithoutRejoinPhase: '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
                    })
                  : formatBodyContinuitySurfaceCarryLine({
                      snapshot: input.latestSnapshot,
                      bodyContinuityGovernanceNote,
                      fallbackWithRejoinPhase: '身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
                      fallbackWithoutRejoinPhase: '身体线已经先把这段 living segment 托住，显形权威仍在补回同一条连续身体线，可直接进入长期基线。',
                    })]
          : []),
      ],
    }
  }

  const prosodyAuthorityNote = pickProsodyAuthorityNote(input.baselineQuality.supportingLines)
  const projectStateContinuityGovernanceNote = pickProjectStateContinuityGovernanceNote(input.baselineQuality.supportingLines)
  const continuityGovernanceNote = pickContinuityGovernanceNote(input.baselineQuality.supportingLines)
  const relationshipCadenceGovernanceNote = pickRelationshipCadenceGovernanceNote(input.baselineQuality.supportingLines)
  const bodyContinuityGovernanceNote = pickBodyContinuityGovernanceNote(input.baselineQuality.supportingLines)
  const bodyContinuityPhase = resolveBodyContinuityPhase({
    snapshot: input.latestSnapshot,
    bodyContinuityGovernanceNote,
  })
  const bodyContinuityBodyOnlyHold = bodyContinuityPhase === 'body-only-hold'
  const bodyContinuityRejoinConfirmed = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
  const bodyContinuityCrossModalLock = bodyContinuityPhase === 'full-cross-modal-lock'
  const bodyContinuityRendererRejoinWithoutBody = bodyContinuityPhase === 'renderer-rejoin-without-body'
  const bodyContinuityRejoinSurface = resolveBodyContinuityRejoinSurface(input.latestSnapshot)
  const survivingVisibleLane = resolveSurvivingVisibleLane(bodyContinuityGovernanceNote)
  return {
    mode: 'observe',
    summaryLine: '先保留这张可信基线，但继续观察是否出现更新快照。',
    detailLine: '它已经可信，不过当前还有更新的连续性快照，先不要立刻把它升格为唯一默认参照。',
    supportingLines: [
      '当前基线质量 verdict 为 trusted。',
      '但历史中已经存在更晚的连续性快照。',
      ...(prosodyAuthorityNote ? ['韵律权威链已经就绪；当前仅因存在更新快照而继续观察。'] : []),
      ...(projectStateContinuityGovernanceNote ? ['项目状态连续性治理已经再次确认；当前仅因存在更新快照而继续观察。'] : []),
      ...(continuityGovernanceNote ? ['same-her 连续性治理已经再次确认；当前仅因存在更新快照而继续观察。'] : []),
      ...(relationshipCadenceGovernanceNote
        ? [isRestrainedCallbackCadenceNote(relationshipCadenceGovernanceNote)
            ? 'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上；当前仅因存在更新快照而继续观察这条更克制的关系节律是否持续稳住。'
            : relationshipCadenceGovernanceNote.includes('长期关系节律')
              ? 'relationship cadence 治理已经再次确认，并开始内化为长期关系节律；当前仅因存在更新快照而继续观察。'
              : 'relationship cadence 治理已经再次确认；当前仅因存在更新快照而继续观察。']
        : []),
      ...(bodyContinuityGovernanceNote
        ? [bodyContinuityRendererRejoinWithoutBody
            ? survivingVisibleLane === 'face+lipsync+voice-only'
              ? '显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察表情、口型、声音这条 same-her 生命线是否仍与同一段 living segment 对齐，并确认 body、motion 是否还没有重新接回这条表情口型声音线。'
              : survivingVisibleLane === 'motion+lipsync+voice-only'
                ? '显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察动作、口型、声音这条 same-her 生命线是否仍与同一段 living segment 对齐，并确认 body、face 是否还没有重新接回这条动作口型声音线。'
                : survivingVisibleLane === 'face+lipsync-only'
                  ? '显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察表情、口型这条 same-her 生命线是否仍与同一段 living segment 对齐，并确认 body、motion、voice 是否还没有重新接回这条表情口型线。'
                  : survivingVisibleLane === 'motion+lipsync-only'
                    ? '显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察动作、口型这条 same-her 生命线是否仍与同一段 living segment 对齐，并确认 body、face、voice 是否还没有重新接回这条动作口型线。'
                    : bodyContinuityRejoinSurface
                      ? `显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察 ${bodyContinuityRejoinSurface} 已回接但身体线未承接的这次可见恢复。`
                      : '显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察显形已回接但身体线未承接的这次可见恢复。'
            : bodyContinuityBodyOnlyHold
              ? '身体连续性已经明确处于身体独撑态；当前仅因存在更新快照而继续观察这段仍由身体线独自托住的 same-segment 承接是否持续稳住。'
              : bodyContinuityCrossModalLock
                ? bodyContinuityRejoinSurface
                  ? `身体连续性已经明确处于跨模态重锁态；当前仅因存在更新快照而继续观察 ${bodyContinuityRejoinSurface} 显形权威是否稳定与身体线共同锁在同一段 living segment 上。`
                  : '身体连续性已经明确处于跨模态重锁态；当前仅因存在更新快照而继续观察显形权威是否稳定与身体线共同锁在同一段 living segment 上。'
                : bodyContinuityRejoinConfirmed
                  ? bodyContinuityRejoinSurface
                    ? `身体连续性已经明确进入身体承接态 -> 显形补回态；当前仅因存在更新快照而继续观察 ${bodyContinuityRejoinSurface} 显形权威是否稳定沿同一条连续身体线补回。`
                    : '身体连续性已经明确进入身体承接态 -> 显形补回态；当前仅因存在更新快照而继续观察显形权威是否稳定沿同一条连续身体线补回。'
                  : bodyContinuityRejoinSurface
                    ? `身体连续性已经重新托住同一段 living segment；当前仅因存在更新快照而继续观察 ${bodyContinuityRejoinSurface} 显形权威是否稳定补回同一条连续身体线。`
                    : '身体连续性已经重新托住同一段 living segment；当前仅因存在更新快照而继续观察显形权威是否稳定补回同一条连续身体线。']
        : []),
    ],
  }
}
