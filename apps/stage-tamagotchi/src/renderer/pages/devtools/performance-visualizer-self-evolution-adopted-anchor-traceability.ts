import { formatRendererRejoinSurfaceLabel } from './performance-visualizer-self-evolution-focus-history-display'

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

interface SelfEvolutionAdoptedAnchorLike {
  adoptedAt?: number
  snapshotCapturedAt: number
  candidateId?: string | null
  decisionTraceId: string | null
  activeThreadId?: string | null
  focusLabel?: string | null
  activePatternKey: string | null
  repairOwnerHint: string | null
  summaryLine?: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  prosodyAuthorityNote?: string | null
  continuityGovernanceNote?: string | null
  relationshipCadenceGovernanceNote?: string | null
  projectStateContinuityGovernanceNote?: string | null
  bodyContinuityGovernanceNote?: string | null
}

interface SelfEvolutionPatternWorkflowLike {
  headline: string
  steps?: unknown[]
  validationChecklist?: unknown[]
}

interface SelfEvolutionPatternContextLike {
  currentCapturedAt?: number
  previousCapturedAt?: number
  side?: 'current' | 'previous'
  summaryLine: string
}

function resolveSurvivingVisibleLane(
  value: string | null | undefined,
): SelfEvolutionSurvivingVisibleLane {
  if (!value)
    return null

  if (value.includes('当前仅剩表情、口型、声音维持同一段连续性'))
    return 'face+lipsync+voice-only'
  if (value.includes('当前仅剩动作、口型、声音维持同一段连续性'))
    return 'motion+lipsync+voice-only'
  if (value.includes('当前只有 face 和 lipsync 这条 same-her 生命线'))
    return 'face+lipsync-only'
  if (value.includes('当前只有 motion 和 lipsync 这条 same-her 生命线'))
    return 'motion+lipsync-only'

  return null
}

function inferBodyContinuityPhase(input: {
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  bodyContinuityGovernanceNote?: string | null
}) {
  if (input.bodyContinuityPhase)
    return input.bodyContinuityPhase
  const note = input.bodyContinuityGovernanceNote
  if (!note)
    return null
  if (resolveSurvivingVisibleLane(note))
    return 'renderer-rejoin-without-body' as const
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

function formatRendererRejoinWithoutBodyAnchorLine(input: {
  survivingVisibleLane: SelfEvolutionSurvivingVisibleLane
  rendererRejoinSurface: string | null
}) {
  if (input.survivingVisibleLane === 'face+lipsync+voice-only') {
    return '这张默认连续性锚点记录的不是可信身体连续性基线，而是当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。'
  }

  if (input.survivingVisibleLane === 'motion+lipsync+voice-only') {
    return '这张默认连续性锚点记录的不是可信身体连续性基线，而是当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线。'
  }

  if (input.survivingVisibleLane === 'face+lipsync-only') {
    return '这张默认连续性锚点记录的不是可信身体连续性基线，而是当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线。'
  }

  if (input.survivingVisibleLane === 'motion+lipsync-only') {
    return '这张默认连续性锚点记录的不是可信身体连续性基线，而是当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线。'
  }

  return input.rendererRejoinSurface
    ? `这张默认连续性锚点记录的不是可信身体连续性基线，而是 ${input.rendererRejoinSurface} 已经回接、但身体线没有继续托住同一段 living segment 的显形回接失身态。`
    : '这张默认连续性锚点记录的不是可信身体连续性基线，而是显形权威已经回接、但身体线没有继续托住同一段 living segment 的显形回接失身态。'
}

function formatRendererRejoinWithoutBodyGovernanceLine(input: {
  note: string
  survivingVisibleLane: SelfEvolutionSurvivingVisibleLane
  rendererRejoinSurface: string | null
}) {
  if (input.survivingVisibleLane === 'face+lipsync+voice-only') {
    return `采纳前提仍然可追溯到${input.note}，而不是把这次 quieter carry 误写成 body、motion 已经补回的修复完成。`
  }

  if (input.survivingVisibleLane === 'motion+lipsync+voice-only') {
    return `采纳前提仍然可追溯到${input.note}，而不是把这次 quieter carry 误写成 body、face 已经补回的修复完成。`
  }

  if (input.survivingVisibleLane === 'face+lipsync-only') {
    return `采纳前提仍然可追溯到${input.note}，而不是把这次 quieter carry 误写成 body、motion、voice 已经补回的修复完成。`
  }

  if (input.survivingVisibleLane === 'motion+lipsync-only') {
    return `采纳前提仍然可追溯到${input.note}，而不是把这次 quieter carry 误写成 body、face、voice 已经补回的修复完成。`
  }

  return input.rendererRejoinSurface
    ? `采纳前提仍然可追溯到${input.note}，而不是把 ${input.rendererRejoinSurface} 已经回接、但身体线没有继续托住同一段 living segment 的失身回接误写成可信长期基线。`
    : `采纳前提仍然可追溯到${input.note}，而不是把显形权威已经回接、但身体线没有继续托住同一段 living segment 的失身回接误写成可信长期基线。`
}

export function buildSelfEvolutionAdoptedAnchorTraceability(input: {
  adoptedAnchor: SelfEvolutionAdoptedAnchorLike | null
  patternSummaryByKey: Record<string, string>
  workflowByPatternKey: Record<string, SelfEvolutionPatternWorkflowLike | undefined>
  patternContextByKey: Record<string, SelfEvolutionPatternContextLike | undefined>
}) {
  if (!input.adoptedAnchor)
    return null

  const patternKey = input.adoptedAnchor.activePatternKey
  if (!patternKey)
    return null

  const workflow = input.workflowByPatternKey[patternKey]
  const context = input.patternContextByKey[patternKey]
  const patternSummary = input.patternSummaryByKey[patternKey]

  const supportingLines = [
    `这张默认连续性锚点来自模式 ${patternKey}，对应快照 ${input.adoptedAnchor.snapshotCapturedAt} 与轨迹 ${input.adoptedAnchor.decisionTraceId ?? 'n/a'}。`,
    `采纳归属仍然锚定在 ${input.adoptedAnchor.repairOwnerHint ?? 'n/a'}，而不是脱离原始修复归属单独漂移。`,
  ]
  const bodyContinuityPhase = inferBodyContinuityPhase({
    bodyContinuityPhase: input.adoptedAnchor.bodyContinuityPhase,
    bodyContinuityGovernanceNote: input.adoptedAnchor.bodyContinuityGovernanceNote,
  })
  const survivingVisibleLane = resolveSurvivingVisibleLane(
    input.adoptedAnchor.bodyContinuityGovernanceNote,
  )

  if (bodyContinuityPhase === 'body-only-hold') {
    supportingLines.push('这张默认连续性锚点记录的不是 generic body carry，而是身体独撑态。')
  }

  if (bodyContinuityPhase === 'body-carried-to-renderer-rejoin') {
    const rendererRejoinSurface = input.adoptedAnchor.rendererRejoinSurfaceKey
      ? formatRendererRejoinSurfaceLabel(input.adoptedAnchor.rendererRejoinSurfaceKey)
      : null
    supportingLines.push(
      rendererRejoinSurface
        ? `这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> ${rendererRejoinSurface} 显形补回态。`
        : '这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> 显形补回态。',
    )
  }

  if (bodyContinuityPhase === 'full-cross-modal-lock') {
    const rendererRejoinSurface = input.adoptedAnchor.rendererRejoinSurfaceKey
      ? formatRendererRejoinSurfaceLabel(input.adoptedAnchor.rendererRejoinSurfaceKey)
      : null
    supportingLines.push(
      rendererRejoinSurface
        ? `这张默认连续性锚点记录的不是 generic body carry，而是身体与 ${rendererRejoinSurface} 已经共同锁回同一段 living segment 的跨模态重锁态。`
        : '这张默认连续性锚点记录的不是 generic body carry，而是身体与显形权威已经共同锁回同一段 living segment 的跨模态重锁态。',
    )
  }

  if (bodyContinuityPhase === 'renderer-rejoin-without-body') {
    const rendererRejoinSurface = input.adoptedAnchor.rendererRejoinSurfaceKey
      ? formatRendererRejoinSurfaceLabel(input.adoptedAnchor.rendererRejoinSurfaceKey)
      : null
    supportingLines.push(
      formatRendererRejoinWithoutBodyAnchorLine({
        survivingVisibleLane,
        rendererRejoinSurface,
      }),
    )
  }

  if (input.adoptedAnchor.prosodyAuthorityNote) {
    supportingLines.push(
      `采纳前提仍然可追溯到${input.adoptedAnchor.prosodyAuthorityNote.replace(/。$/, '')}，而不是 renderer 本地猜测重新接管口型。`,
    )
  }

  if (input.adoptedAnchor.continuityGovernanceNote) {
    supportingLines.push(
      `采纳前提仍然可追溯到${input.adoptedAnchor.continuityGovernanceNote.replace(/。$/, '')}，而不是把记忆先行的熟悉感误写成应该被修掉的漂移。`,
    )
  }

  if (input.adoptedAnchor.bodyContinuityGovernanceNote) {
    const rendererRejoinSurface = (
      bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
      || bodyContinuityPhase === 'full-cross-modal-lock'
      || bodyContinuityPhase === 'renderer-rejoin-without-body'
    )
      ? input.adoptedAnchor.rendererRejoinSurfaceKey
        ? formatRendererRejoinSurfaceLabel(input.adoptedAnchor.rendererRejoinSurfaceKey)
        : null
      : null
    supportingLines.push(
      bodyContinuityPhase === 'body-only-hold'
        ? `采纳前提仍然可追溯到${input.adoptedAnchor.bodyContinuityGovernanceNote.replace(/。$/, '')}，而不是把仍由身体线独自托住同一段 living segment 的低显形阶段误写成已经失败或已经完成。`
        : bodyContinuityPhase === 'full-cross-modal-lock' && rendererRejoinSurface
          ? `采纳前提仍然可追溯到${input.adoptedAnchor.bodyContinuityGovernanceNote.replace(/。$/, '')}，而不是把身体线与 ${rendererRejoinSurface} 共同锁回同一段 living segment 的稳定回归误写成短暂同步。`
          : bodyContinuityPhase === 'full-cross-modal-lock'
            ? `采纳前提仍然可追溯到${input.adoptedAnchor.bodyContinuityGovernanceNote.replace(/。$/, '')}，而不是把身体线与显形权威共同锁回同一段 living segment 的稳定回归误写成短暂同步。`
            : bodyContinuityPhase === 'renderer-rejoin-without-body'
              ? formatRendererRejoinWithoutBodyGovernanceLine({
                  note: input.adoptedAnchor.bodyContinuityGovernanceNote.replace(/。$/, ''),
                  survivingVisibleLane,
                  rendererRejoinSurface,
                })
              : rendererRejoinSurface
                ? `采纳前提仍然可追溯到${input.adoptedAnchor.bodyContinuityGovernanceNote.replace(/。$/, '')}，而不是把身体线先托住同一段 living segment、并让 ${rendererRejoinSurface} 沿同一条连续身体线补回显形权威的回归误写成 generic partial drift。`
                : `采纳前提仍然可追溯到${input.adoptedAnchor.bodyContinuityGovernanceNote.replace(/。$/, '')}，而不是把身体线先托住同一段 living segment、并让显形权威沿同一条连续身体线补回的回归误写成 generic partial drift。`,
    )
  }

  if (input.adoptedAnchor.projectStateContinuityGovernanceNote) {
    supportingLines.push(
      `采纳前提仍然可追溯到${input.adoptedAnchor.projectStateContinuityGovernanceNote.replace(/。$/, '')}，而不是把项目身份、Phase 1 主线和未闭环任务承接误写成普通 same-her 漂移修复。`,
    )
  }

  if (input.adoptedAnchor.relationshipCadenceGovernanceNote) {
    supportingLines.push(
      input.adoptedAnchor.relationshipCadenceGovernanceNote.includes('same-turn-if-invited measured-return')
      && input.adoptedAnchor.relationshipCadenceGovernanceNote.includes('callback line')
        ? `采纳前提仍然可追溯到${input.adoptedAnchor.relationshipCadenceGovernanceNote.replace(/。$/, '')}，而不是把这种仍停在同一条 callback line 上的慢回归误写成已经可以全面外放的长期关系基线。`
        : input.adoptedAnchor.relationshipCadenceGovernanceNote.includes('长期关系节律')
          ? `采纳前提仍然可追溯到${input.adoptedAnchor.relationshipCadenceGovernanceNote.replace(/。$/, '')}，而不是把这种慢回归误写成需要被强行加速的漂移，而是把它视为同一个她正在稳定下来的关系韵律。`
          : `采纳前提仍然可追溯到${input.adoptedAnchor.relationshipCadenceGovernanceNote.replace(/。$/, '')}，而不是把慢回归误写成需要被强行加速的漂移。`,
    )
  }

  supportingLines.push('若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。')

  return {
    patternKey,
    patternSummary,
    workflowHeadline: workflow?.headline ?? null,
    workflowContextLine: context?.summaryLine ?? null,
    supportingLines,
  }
}
