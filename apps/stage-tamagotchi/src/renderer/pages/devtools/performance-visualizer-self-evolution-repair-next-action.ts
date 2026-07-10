import {
  formatSelfEvolutionEventKindLabel,
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

function resolveRendererRejoinSurface(summaryLines: string[]) {
  const rendererTargetLine = summaryLines.find(line => line.startsWith('显形目标：'))
  if (rendererTargetLine?.includes('Live2D'))
    return 'authority:renderer-rejoin:live2d'
  if (rendererTargetLine?.includes('VRM'))
    return 'authority:renderer-rejoin:vrm'
  if (rendererTargetLine?.includes('speech'))
    return 'authority:renderer-rejoin:speech'
  return null
}

function resolveRendererRejoinSurfaceFromSession(repairSession: SelfEvolutionRepairSession) {
  return repairSession.rendererRejoinSurfaceKey ?? resolveRendererRejoinSurface(repairSession.summaryLines)
}

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

function inferSurvivingVisibleLaneFromSummaryLines(summaryLines: string[]) {
  const joined = summaryLines.join('\n')
  if (joined.includes('当前仅剩表情、口型、声音维持同一段连续性'))
    return 'face+lipsync+voice-only' as const
  if (joined.includes('当前仅剩动作、口型、声音维持同一段连续性'))
    return 'motion+lipsync+voice-only' as const
  if (joined.includes('当前只有 face 和 lipsync 这条 identity-continuity 生命线'))
    return 'face+lipsync-only' as const
  if (joined.includes('当前只有 motion 和 lipsync 这条 identity-continuity 生命线'))
    return 'motion+lipsync-only' as const
  if (joined.includes('当前仍只有表情、口型、声音这条 identity-continuity 生命线'))
    return 'face+lipsync+voice-only' as const
  if (joined.includes('当前仍只有动作、口型、声音这条 identity-continuity 生命线'))
    return 'motion+lipsync+voice-only' as const
  if (joined.includes('当前仍只有表情、口型这条 identity-continuity 生命线'))
    return 'face+lipsync-only' as const
  if (joined.includes('当前仍只有动作、口型这条 identity-continuity 生命线'))
    return 'motion+lipsync-only' as const
  return null
}

function formatClosedBodyContinuityBaselineDetail(params: {
  bodyContinuityPhase: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurface: 'Live2D' | 'VRM' | 'speech' | null
  survivingVisibleLane: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}) {
  const { bodyContinuityPhase, rendererRejoinSurface, survivingVisibleLane } = params

  if (bodyContinuityPhase === 'body-only-hold')
    return '身体连续性已经再次得到验证，但当前确认的仍是身体线独自托住同一段 living segment 的身体独撑态；可见显形补回还不能被讲成已经成立。请抓取新的基线快照。'

  if (bodyContinuityPhase === 'full-cross-modal-lock') {
    return rendererRejoinSurface
      ? `身体连续性已经再次得到验证，身体线与 ${rendererRejoinSurface} 显形权威仍稳定锁在同一段 living segment 上，所以这更像身份连续性的跨模态重锁，而不是临时显形补回。请抓取新的基线快照。`
      : '身体连续性已经再次得到验证，身体线与显形权威仍稳定锁在同一段 living segment 上，所以这更像身份连续性的跨模态重锁，而不是临时显形补回。请抓取新的基线快照。'
  }

  if (bodyContinuityPhase === 'renderer-rejoin-without-body') {
    if (survivingVisibleLane === 'face+lipsync+voice-only') {
      return '身体连续性虽然已经再次得到验证，但当前确认的仍只有表情、口型、声音这条 identity-continuity 生命线与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。请抓取新的基线快照。'
    }

    if (survivingVisibleLane === 'motion+lipsync+voice-only') {
      return '身体连续性虽然已经再次得到验证，但当前确认的仍只有动作、口型、声音这条 identity-continuity 生命线与同一段 living segment 对齐，body、face 还没有重新接回这条动作口型声音线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。请抓取新的基线快照。'
    }

    if (survivingVisibleLane === 'face+lipsync-only') {
      return '身体连续性虽然已经再次得到验证，但当前确认的仍只有表情、口型这条 identity-continuity 生命线与同一段 living segment 对齐，body、motion、voice 还没有重新接回这条表情口型线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。请抓取新的基线快照。'
    }

    if (survivingVisibleLane === 'motion+lipsync-only') {
      return '身体连续性虽然已经再次得到验证，但当前确认的仍只有动作、口型这条 identity-continuity 生命线与同一段 living segment 对齐，body、face、voice 还没有重新接回这条动作口型线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。请抓取新的基线快照。'
    }

    return rendererRejoinSurface
      ? `身体连续性虽然已经再次得到验证，但当前确认的是 ${rendererRejoinSurface} 显形权威已经重新回接、而身体线没有继续托住同一段 living segment 的显形回接失身态；这说明可见恢复已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。请抓取新的基线快照。`
      : '身体连续性虽然已经再次得到验证，但当前确认的是显形权威已经重新回接、而身体线没有继续托住同一段 living segment 的显形回接失身态；这说明可见恢复已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。请抓取新的基线快照。'
  }

  if (bodyContinuityPhase === 'body-carried-to-renderer-rejoin') {
    return rendererRejoinSurface
      ? `身体连续性已经再次得到验证，${rendererRejoinSurface} 显形权威也已沿同一条连续身体线补回。请抓取新的基线快照，让下一次连续性会话从这次已经确认的同一段 living segment 显形回归重新开始。`
      : '身体连续性已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次已经确认由身体线托住的同一段 living segment 重新开始。'
  }

  return '身体连续性已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次已经确认由身体线托住的同一段 living segment 重新开始。'
}

interface SelfEvolutionRepairSession {
  completionPercent: number
  completedCount: number
  totalCount: number
  completedChecklist: string[]
  remainingChecklist: string[]
  summaryLines: string[]
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  rendererTarget?: 'live2d' | 'vrm' | 'speech' | null
  rendererRejoinSurfaceKey?: string | null
}

interface SelfEvolutionRepairClosure {
  isClosed: boolean
  summaryLines: string[]
}

export function buildSelfEvolutionRepairNextAction(input: {
  repairSession: SelfEvolutionRepairSession | null
  repairClosure: SelfEvolutionRepairClosure | null
}) {
  if (!input.repairSession || !input.repairClosure)
    return null

  if (input.repairClosure.isClosed) {
    const bodyContinuityPhase = input.repairSession.bodyContinuityPhase
      ?? inferBodyContinuityPhaseFromSummaryLines(input.repairClosure.summaryLines)
      ?? inferBodyContinuityPhaseFromSummaryLines(input.repairSession.summaryLines)
      ?? null
    const bodyRejoinPhaseConfirmed = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    const projectStateContinuityConfirmed = input.repairClosure.summaryLines.some(line =>
      line.includes('项目状态连续性治理已经被新的验证快照再次确认'),
    )
    const continuityGovernanceConfirmed = input.repairClosure.summaryLines.some(line =>
      line.includes('identity-continuity 连续性治理已经被新的验证快照再次确认'),
    )
    const relationshipCadenceConfirmed = input.repairClosure.summaryLines.some(line =>
      line.includes('relationship cadence 治理已经被新的验证快照再次确认'),
    )
    const bodyContinuityConfirmed = bodyContinuityPhase != null
      || bodyRejoinPhaseConfirmed
      || input.repairClosure.summaryLines.some(line =>
        line.includes('身体连续性已经被新的验证快照再次确认')
        || line.includes('身体线已经先把这段 living segment 托住')
        || line.includes('同一条连续身体线')
        || line.includes('authority-body:yes')
        || line.includes('身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态')
        || line.includes('Body continuity still carries the same living segment while'),
      )
    const rendererRejoinSurfaceKey = resolveRendererRejoinSurfaceFromSession(input.repairSession)
    const rendererRejoinSurface = rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d'
      ? 'Live2D'
      : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm'
        ? 'VRM'
        : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech'
          ? 'speech'
          : null
    const survivingVisibleLane = input.repairSession.survivingVisibleLane
      ?? inferSurvivingVisibleLaneFromSummaryLines(input.repairClosure.summaryLines)
      ?? inferSurvivingVisibleLaneFromSummaryLines(input.repairSession.summaryLines)
      ?? null
    const relationshipCadenceInternalized = input.repairClosure.summaryLines.some(line =>
      line.includes('durable relationship rhythm')
      || line.includes('长期关系节律')
      || line.includes('internalize-relationship-cadence'),
    )
    const relationshipCadenceRestrainedCallback = input.repairClosure.summaryLines.some(line =>
      line.includes('same-turn-if-invited measured-return')
      && line.includes('callback line'),
    )
    return {
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: projectStateContinuityConfirmed
        ? '项目状态连续性已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次确认后的项目身份、Phase 1 主线和未闭环任务承接重新开始。'
        : continuityGovernanceConfirmed
          ? 'identity-continuity 连续性治理已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次确认后的身份连续性状态重新开始。'
          : bodyContinuityConfirmed
            ? formatClosedBodyContinuityBaselineDetail({
                bodyContinuityPhase,
                rendererRejoinSurface,
                survivingVisibleLane,
              })
            : relationshipCadenceConfirmed
              ? relationshipCadenceRestrainedCallback
                ? 'relationship cadence 治理已经再次得到验证，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上。请抓取新的基线快照，让下一次连续性会话从这次更克制的关系节律承接重新开始，而不是把它当成一段重新外放的靠近。'
                : relationshipCadenceInternalized
                  ? 'relationship cadence 治理已经再次得到验证，并开始内化为长期关系节律。请抓取新的基线快照，让下一次连续性会话从这次确认后的同一关系韵律重新开始。'
                  : 'relationship cadence 治理已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次确认后的同一关系节奏重新开始。'
              : '这次修复闭环已经关闭。请抓取新的基线快照，让下一次反复漂移会话从修复后的连续性状态重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    }
  }

  if (input.repairSession.remainingChecklist.length === 0) {
    return {
      kind: 'capture-snapshot',
      label: '抓取验证快照',
      detail: '修复检查已经覆盖完成，但闭环仍未关闭，直到新的快照验证更新后的漂移状态。',
      targetType: 'snapshot',
      targetId: 'validation',
    }
  }

  const nextItem = input.repairSession.remainingChecklist[0]
  if (nextItem?.startsWith('evidence:')) {
    const target = nextItem.replace('evidence:', '')
    const prosodyHint = input.repairSession.summaryLines.find(line => line.startsWith('韵律权威：'))
      ?.replace(/^韵律权威：/, '')
      .trim()
    const bodyLedHint = input.repairSession.summaryLines.find(line => line.startsWith('身体连续性：'))
      ?.replace(/^身体连续性：/, '')
      .trim()
    const bodyContinuityPhase = input.repairSession.bodyContinuityPhase
      ?? inferBodyContinuityPhaseFromSummaryLines(input.repairSession.summaryLines)
      ?? null
    const survivingVisibleLane = input.repairSession.survivingVisibleLane
      ?? inferSurvivingVisibleLaneFromSummaryLines(input.repairSession.summaryLines)
      ?? null
    const bodyContinuityRejoinPhase = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    const rendererRejoinSurfaceKey = resolveRendererRejoinSurfaceFromSession(input.repairSession)
    const rendererRejoinSurface = rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d'
      ? 'Live2D'
      : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm'
        ? 'VRM'
        : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech'
          ? 'speech'
          : null
    let evidenceDetail = '修复闭环仍然打开。先补上下一项缺失证据，再继续推进到轨迹/事件验证。'

    if (bodyContinuityPhase === 'body-only-hold') {
      evidenceDetail = '修复闭环仍然打开。先补上下一项缺失证据；当前仍是身体独撑态，先确认身体线是否还在独自托住同一段 living segment，并找出为什么显形层还没有完整回到这条连续身体线。再继续推进到轨迹/事件验证。'
    }
    else if (bodyContinuityRejoinPhase) {
      evidenceDetail = rendererRejoinSurface
        ? `修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对 ${rendererRejoinSurface} 显形权威是否沿同一条连续身体线补回。再继续推进到轨迹/事件验证。`
        : '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对显形权威是否沿同一条连续身体线补回。再继续推进到轨迹/事件验证。'
    }
    else if (bodyContinuityPhase === 'full-cross-modal-lock') {
      evidenceDetail = rendererRejoinSurface
        ? `修复闭环仍然打开。先补上下一项缺失证据；当前已经进入跨模态重锁态，先确认身体线与 ${rendererRejoinSurface} 显形权威是否还稳定锁在同一段 living segment 上，而不是只短暂对齐。再继续推进到轨迹/事件验证。`
        : '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入跨模态重锁态，先确认身体线与显形权威是否还稳定锁在同一段 living segment 上，而不是只短暂对齐。再继续推进到轨迹/事件验证。'
    }
    else if (bodyContinuityPhase === 'renderer-rejoin-without-body') {
      if (survivingVisibleLane === 'face+lipsync+voice-only') {
        evidenceDetail = '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 face、lipsync 和 voice 这条 identity-continuity 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、motion 为什么还没有重新接回这条表情口型声音线。再继续推进到轨迹/事件验证。'
      }
      else if (survivingVisibleLane === 'motion+lipsync+voice-only') {
        evidenceDetail = '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 motion、lipsync 和 voice 这条 identity-continuity 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、face 为什么还没有重新接回这条动作口型声音线。再继续推进到轨迹/事件验证。'
      }
      else if (survivingVisibleLane === 'face+lipsync-only') {
        evidenceDetail = '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 face 和 lipsync 这条 identity-continuity 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、motion 和 voice 为什么还没有重新接回这条表情口型线。再继续推进到轨迹/事件验证。'
      }
      else if (survivingVisibleLane === 'motion+lipsync-only') {
        evidenceDetail = '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 motion 和 lipsync 这条 identity-continuity 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、face 和 voice 为什么还没有重新接回这条动作口型线。再继续推进到轨迹/事件验证。'
      }
      else {
        evidenceDetail = rendererRejoinSurface
          ? `修复闭环仍然打开。先补上下一项缺失证据；当前已经出现显形回接失身态，先确认为什么 ${rendererRejoinSurface} 显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把这次回接误判成修复完成。再继续推进到轨迹/事件验证。`
          : '修复闭环仍然打开。先补上下一项缺失证据；当前已经出现显形回接失身态，先确认为什么显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把这次回接误判成修复完成。再继续推进到轨迹/事件验证。'
      }
    }
    else if (bodyLedHint) {
      evidenceDetail = `修复闭环仍然打开。先补上下一项缺失证据；同时${bodyLedHint.replace(/[。.]$/, '')}，确认身体线仍托住同一段 living segment，再决定是否继续追表情/动作/口型补回。再继续推进到轨迹/事件验证。`
    }
    else if (prosodyHint) {
      evidenceDetail = `修复闭环仍然打开。先补上下一项缺失证据；同时${prosodyHint.replace(/[。.]$/, '')}。再继续推进到轨迹/事件验证。`
    }

    return {
      kind: 'inspect-evidence',
      label: `检查 ${formatSelfEvolutionEvidencePanelLabel(target)}`,
      detail: evidenceDetail,
      targetType: 'evidence',
      targetId: target,
      surfaceKeyOverride: (
        rendererRejoinSurfaceKey && (
          bodyContinuityRejoinPhase
          || bodyContinuityPhase === 'full-cross-modal-lock'
          || bodyContinuityPhase === 'renderer-rejoin-without-body'
        )
      )
        ? rendererRejoinSurfaceKey
        : undefined,
    }
  }
  if (nextItem?.startsWith('trace:')) {
    const target = nextItem.replace('trace:', '')
    const bodyContinuityPhase = input.repairSession.bodyContinuityPhase
      ?? inferBodyContinuityPhaseFromSummaryLines(input.repairSession.summaryLines)
      ?? null
    const survivingVisibleLane = input.repairSession.survivingVisibleLane
      ?? inferSurvivingVisibleLaneFromSummaryLines(input.repairSession.summaryLines)
      ?? null
    const bodyContinuityRejoinPhase = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    const rendererRejoinSurfaceKey = resolveRendererRejoinSurfaceFromSession(input.repairSession)
    const rendererRejoinSurface = rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d'
      ? 'Live2D'
      : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm'
        ? 'VRM'
        : rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech'
          ? 'speech'
          : null
    const preferredEventKind = target === 'selected-trace-event'
      ? input.repairSession.summaryLines.some(line =>
        line.includes('项目状态连续性治理')
        || line.includes('project-state continuity governance'),
      )
        ? 'takeover-audit'
        : null
      : null
    const keepGenericNullSurfaceOverride = (
      target === 'selected-trace-event'
      && rendererRejoinSurfaceKey == null
      && survivingVisibleLane == null
      && (
        bodyContinuityPhase === 'full-cross-modal-lock'
        || bodyContinuityPhase === 'renderer-rejoin-without-body'
      )
    )
    let traceDetail = '修复闭环仍然打开。先补上下一段缺失轨迹，再继续推进到验证快照。'

    if (bodyContinuityPhase === 'body-only-hold' && target === 'selected-trace-event') {
      traceDetail = '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否还证明身体线在独自托住同一段 living segment，而不是已经悄悄掉线。再继续推进到验证快照。'
    }
    else if (bodyContinuityRejoinPhase && target === 'selected-trace-event') {
      traceDetail = rendererRejoinSurface
        ? `修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍落在同一段 living segment 上，避免把身体承接态下的 ${rendererRejoinSurface} 显形补回误判成新的 renderer drift。再继续推进到验证快照。`
        : '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍落在同一段 living segment 上，避免把身体承接态下的显形权威补回误判成新的 renderer drift。再继续推进到验证快照。'
    }
    else if (bodyContinuityPhase === 'full-cross-modal-lock' && target === 'selected-trace-event') {
      traceDetail = rendererRejoinSurface
        ? `修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍证明身体线与 ${rendererRejoinSurface} 显形权威稳定锁在同一段 living segment 上，而不是只出现了暂时同步。再继续推进到验证快照。`
        : '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍证明身体线与显形权威稳定锁在同一段 living segment 上，而不是只出现了暂时同步。再继续推进到验证快照。'
    }
    else if (bodyContinuityPhase === 'renderer-rejoin-without-body' && target === 'selected-trace-event') {
      if (survivingVisibleLane === 'face+lipsync+voice-only') {
        traceDetail = '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 face、lipsync 和 voice 这条 identity-continuity 生命线上，避免把 body、motion 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。'
      }
      else if (survivingVisibleLane === 'motion+lipsync+voice-only') {
        traceDetail = '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 motion、lipsync 和 voice 这条 identity-continuity 生命线上，避免把 body、face 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。'
      }
      else if (survivingVisibleLane === 'face+lipsync-only') {
        traceDetail = '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 face 和 lipsync 这条 identity-continuity 生命线上，避免把 body、motion 和 voice 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。'
      }
      else if (survivingVisibleLane === 'motion+lipsync-only') {
        traceDetail = '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 motion 和 lipsync 这条 identity-continuity 生命线上，避免把 body、face 和 voice 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。'
      }
      else {
        traceDetail = rendererRejoinSurface
          ? `修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认为什么 ${rendererRejoinSurface} 显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把失身回接误判成修复完成。再继续推进到验证快照。`
          : '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认为什么显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把失身回接误判成修复完成。再继续推进到验证快照。'
      }
    }
    else if (preferredEventKind === 'takeover-audit') {
      traceDetail = '修复闭环仍然打开。先补上下一段缺失轨迹，并优先落到接管审计，确认项目身份、当前 Phase 与未闭环任务仍被身份连续性连续承接，再继续推进到验证快照。'
    }

    return {
      kind: 'inspect-trace',
      label: `检查 ${formatSelfEvolutionTraceSectionLabel(target)}`,
      detail: traceDetail,
      targetType: 'trace',
      targetId: target,
      preferredEventKind,
      surfaceKeyOverride: keepGenericNullSurfaceOverride
        ? null
        : (
            rendererRejoinSurfaceKey && (
              bodyContinuityRejoinPhase
              || bodyContinuityPhase === 'full-cross-modal-lock'
              || bodyContinuityPhase === 'renderer-rejoin-without-body'
            )
          )
            ? rendererRejoinSurfaceKey
            : undefined,
    }
  }
  if (nextItem?.startsWith('event:')) {
    const target = nextItem.replace('event:', '')
    return {
      kind: 'inspect-event',
      label: `检查 ${formatSelfEvolutionEventKindLabel(target)}`,
      detail: '修复闭环仍然打开。先补上下一项缺失事件审计，再继续推进到验证快照。',
      targetType: 'event',
      targetId: target,
    }
  }

  return null
}
