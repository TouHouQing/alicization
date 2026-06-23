export interface SelfEvolutionRepairClosureLike {
  isClosed: boolean
  sessionCovered: boolean
  hasFreshValidationSnapshot: boolean
  samePatternStillPresent: boolean
  prosodyAuthorityRelevant: boolean
  prosodyAuthorityValidated: boolean | null
  summaryLines: string[]
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

function resolveRendererRejoinSurface(summaryLines: string[]) {
  for (const line of summaryLines) {
    const match = line.match(
      /(?:身体承接态 -> 显形补回态|跨模态重锁态|显形回接失身态)（(Live2D|VRM|speech)(?: authority rejoin| authority lock| authority rejoin without same-segment body carry)?）/,
    )
    if (match)
      return match[1]
  }
  return null
}

function resolveRendererRejoinSurfaceFromClosure(closure: SelfEvolutionRepairClosureLike) {
  if (closure.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'
  if (closure.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'
  if (closure.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'
  return resolveRendererRejoinSurface(closure.summaryLines)
}

function resolveSurvivingVisibleLane(
  closure: SelfEvolutionRepairClosureLike,
): SelfEvolutionSurvivingVisibleLane {
  if (closure.survivingVisibleLane)
    return closure.survivingVisibleLane

  const joined = closure.summaryLines.join('\n')

  if (joined.includes('当前仅剩表情、口型、声音维持同一段连续性'))
    return 'face+lipsync+voice-only'
  if (joined.includes('当前仅剩动作、口型、声音维持同一段连续性'))
    return 'motion+lipsync+voice-only'
  if (joined.includes('当前只有 face 和 lipsync 这条 same-her 生命线'))
    return 'face+lipsync-only'
  if (joined.includes('当前只有 motion 和 lipsync 这条 same-her 生命线'))
    return 'motion+lipsync-only'
  if (joined.includes('当前仍只有表情、口型、声音这条 same-her 生命线'))
    return 'face+lipsync+voice-only'
  if (joined.includes('当前仍只有动作、口型、声音这条 same-her 生命线'))
    return 'motion+lipsync+voice-only'
  if (joined.includes('当前仍只有表情、口型这条 same-her 生命线'))
    return 'face+lipsync-only'
  if (joined.includes('当前仍只有动作、口型这条 same-her 生命线'))
    return 'motion+lipsync-only'

  return null
}

function inferBodyContinuityPhaseFromSummaryLines(summaryLines: string[]) {
  const joined = summaryLines.join('\n')
  if (joined.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body' as const
  if (joined.includes('跨模态重锁态'))
    return 'full-cross-modal-lock' as const
  if (
    joined.includes('身体连续性已经明确进入身体承接态 -> 显形补回态')
    || joined.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
    || joined.includes('同一条连续身体线')
  ) {
    return 'body-carried-to-renderer-rejoin' as const
  }
  if (
    joined.includes('身体独撑态')
    || joined.includes('独自托住同一段 living segment')
  ) {
    return 'body-only-hold' as const
  }
  return null
}

function formatBodyContinuityClosureOutcome(params: {
  closure: SelfEvolutionRepairClosureLike
  rendererRejoinSurface: string | null
}) {
  const { closure, rendererRejoinSurface } = params
  const bodyContinuityPhase = closure.bodyContinuityPhase
    ?? inferBodyContinuityPhaseFromSummaryLines(closure.summaryLines)
    ?? null
  const survivingVisibleLane = resolveSurvivingVisibleLane(closure)

  if (bodyContinuityPhase === 'renderer-rejoin-without-body') {
    if (survivingVisibleLane === 'face+lipsync+voice-only') {
      return {
        summaryLine: '表情、口型、声音 same-her 存活线闭环已确认。',
        detailLine: '这次身体连续性虽然已经再次得到验证，但当前确认的仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。',
      }
    }

    if (survivingVisibleLane === 'motion+lipsync+voice-only') {
      return {
        summaryLine: '动作、口型、声音 same-her 存活线闭环已确认。',
        detailLine: '这次身体连续性虽然已经再次得到验证，但当前确认的仍只有动作、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、face 还没有重新接回这条动作口型声音线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。',
      }
    }

    if (survivingVisibleLane === 'face+lipsync-only') {
      return {
        summaryLine: '表情、口型 same-her 存活线闭环已确认。',
        detailLine: '这次身体连续性虽然已经再次得到验证，但当前确认的仍只有表情、口型这条 same-her 生命线与同一段 living segment 对齐，body、motion、voice 还没有重新接回这条表情口型线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。',
      }
    }

    if (survivingVisibleLane === 'motion+lipsync-only') {
      return {
        summaryLine: '动作、口型 same-her 存活线闭环已确认。',
        detailLine: '这次身体连续性虽然已经再次得到验证，但当前确认的仍只有动作、口型这条 same-her 生命线与同一段 living segment 对齐，body、face、voice 还没有重新接回这条动作口型线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。',
      }
    }

    return {
      summaryLine: rendererRejoinSurface
        ? `显形回接失身态（${rendererRejoinSurface}）已完成闭环确认。`
        : '显形回接失身态已完成闭环确认。',
      detailLine: rendererRejoinSurface
        ? `这次身体连续性虽然已经再次得到验证，但当前确认的是 ${rendererRejoinSurface} authority 已经重新回接、而身体线没有继续托住同一段 living segment 的显形回接失身态；这说明可见恢复已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。`
        : '这次身体连续性虽然已经再次得到验证，但当前确认的是显形权威已经重新回接、而身体线没有继续托住同一段 living segment 的显形回接失身态；这说明可见恢复已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。',
    }
  }

  if (bodyContinuityPhase === 'full-cross-modal-lock') {
    return {
      summaryLine: rendererRejoinSurface
        ? `身体与 ${rendererRejoinSurface} 跨模态重锁闭环已确认。`
        : '身体跨模态重锁闭环已确认。',
      detailLine: rendererRejoinSurface
        ? `这次身体连续性已经再次得到验证，身体线与 ${rendererRejoinSurface} authority 仍稳定锁在同一段 living segment 上，所以这更像同一个 her 的跨模态重锁，而不是临时显形补回。`
        : '这次身体连续性已经再次得到验证，身体线与显形权威仍稳定锁在同一段 living segment 上，所以这更像同一个 her 的跨模态重锁，而不是临时显形补回。',
    }
  }

  if (bodyContinuityPhase === 'body-only-hold') {
    return {
      summaryLine: '身体独撑态闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，但当前确认的仍是身体线独自托住同一段 living segment 的身体独撑态；可见显形补回还不能被讲成已经成立。',
    }
  }

  return {
    summaryLine: rendererRejoinSurface
      ? `身体承接态 -> ${rendererRejoinSurface} 显形补回闭环已确认。`
      : '身体连续性闭环已确认。',
    detailLine: rendererRejoinSurface
      ? `这次身体连续性已经再次得到验证，身体线继续托住同一段 living segment，而 ${rendererRejoinSurface} authority 也沿着同一条连续身体线补回，所以这更像同一个 her 的显形回归，而不是新的 renderer branch。`
      : '这次身体连续性已经再次得到验证，身体线继续托住同一段 living segment，表情、动作、口型都仍朝着同一条连续身体线补回。',
  }
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
    const projectStateContinuityConfirmed = input.repairClosureAfter.summaryLines.some(line =>
      line.includes('项目状态连续性治理已经被新的验证快照再次确认'),
    )
    const continuityGovernanceConfirmed = input.repairClosureAfter.summaryLines.some(line =>
      line.includes('same-her 连续性治理已经被新的验证快照再次确认'),
    )
    const bodyContinuityConfirmed = input.repairClosureAfter.summaryLines.some(line =>
      line.includes('身体连续性已经被新的验证快照再次确认')
      || line.includes('身体线已经先把这段 living segment 托住')
      || line.includes('同一条连续身体线')
      || line.includes('authority-body:yes'),
    )
    || inferBodyContinuityPhaseFromSummaryLines(input.repairClosureAfter.summaryLines) != null
    const rendererRejoinSurface = resolveRendererRejoinSurfaceFromClosure(input.repairClosureAfter)
    const relationshipCadenceConfirmed = input.repairClosureAfter.summaryLines.some(line =>
      line.includes('relationship cadence 治理已经被新的验证快照再次确认'),
    )
    const relationshipCadenceCallbackLine = input.repairClosureAfter.summaryLines.some(line =>
      line.includes('same-turn-if-invited measured-return')
      && line.includes('callback line'),
    )
    const relationshipCadenceInternalized = input.repairClosureAfter.summaryLines.some(line =>
      line.includes('durable relationship rhythm')
      || line.includes('长期关系节律')
      || line.includes('internalize-relationship-cadence'),
    )
    const bodyContinuityClosureOutcome = bodyContinuityConfirmed
      ? formatBodyContinuityClosureOutcome({
          closure: input.repairClosureAfter,
          rendererRejoinSurface,
        })
      : null
    return {
      closureChanged,
      improvedSignals,
      unresolvedSignals,
      summaryLine: bodyContinuityClosureOutcome
        ? bodyContinuityClosureOutcome.summaryLine
        : projectStateContinuityConfirmed
          ? '项目状态连续性闭环已确认。'
          : continuityGovernanceConfirmed
            ? 'same-her 连续性闭环已确认。'
            : relationshipCadenceConfirmed
              ? relationshipCadenceCallbackLine
                ? 'relationship cadence callback-line 闭环已确认。'
                : relationshipCadenceInternalized
                  ? 'relationship cadence 长期节律闭环已确认。'
                  : 'relationship cadence 连续性闭环已确认。'
              : '修复闭环已关闭。',
      detailLine: bodyContinuityClosureOutcome
        ? bodyContinuityClosureOutcome.detailLine
        : projectStateContinuityConfirmed
          ? '这次项目状态连续性治理已经再次得到验证，项目身份、Phase 1 本地主数字生命主线与未闭环任务承接继续保持在同一条 same-her 生命线程里。'
          : continuityGovernanceConfirmed
            ? '这次连续性治理已经再次得到验证，remembered familiarity 仍然保持 memory-first，same-her room 与 bounded-growth 继续一致。'
            : relationshipCadenceConfirmed
              ? relationshipCadenceCallbackLine
                ? '这次关系节奏治理已经再次得到验证，但 companionship hold mode、settle cadence 与 resident projection 仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，所以这更像同一个 her 的克制回身，而不是一段已经重新外放的靠近。'
                : relationshipCadenceInternalized
                  ? '这次关系节奏治理已经再次得到验证，companionship hold mode、settle cadence 与 resident projection 不只保持同一条回归路径，也开始被固定成长期关系节律。'
                  : '这次关系节奏治理已经再次得到验证，companionship hold mode、settle cadence 与 resident projection 继续保持同一条回归路径。'
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
