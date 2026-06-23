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
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}

interface SelfEvolutionFocusSnapshotLike {
  capturedAt: number
}

interface SelfEvolutionFocusHistoryPatternLike {
  patternKey: string
  occurrenceCount: number
}

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

function resolveSurvivingVisibleLane(
  summaryLines: string[],
): SelfEvolutionSurvivingVisibleLane {
  const joined = summaryLines.join('\n')

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
  const callbackBoundedMeasuredReturn = input.repairSession.summaryLines.some(line =>
    line.includes('same-turn-if-invited')
    && line.includes('measured-return')
    && (
      line.includes('same callback line')
      || line.includes('同一条 callback line')
    ),
  )
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

  const projectStateContinuityRelevant = input.repairSession.summaryLines.some(line =>
    line.includes('项目状态连续性治理')
    || line.includes('project-state continuity governance'),
  )
  const bodyContinuityRelevant = input.repairSession.summaryLines.some(line =>
    line.includes('身体连续性治理')
    || line.includes('body continuity governance')
    || line.startsWith('身体连续性：'),
  )
  const bodyContinuityPhase = input.repairSession.bodyContinuityPhase ?? null
  const bodyContinuityRendererRejoin = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
  const fullCrossModalLock = bodyContinuityPhase === 'full-cross-modal-lock'
  const bodyOnlyHold = bodyContinuityPhase === 'body-only-hold'
  const rendererRejoinWithoutBody = bodyContinuityPhase === 'renderer-rejoin-without-body'
  const survivingVisibleLane = input.repairSession.survivingVisibleLane
    ?? resolveSurvivingVisibleLane(input.repairSession.summaryLines)
  const rendererRejoinSurface = input.repairSession.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d'
    ? 'Live2D'
    : input.repairSession.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm'
      ? 'VRM'
      : input.repairSession.rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech'
        ? 'speech'
        : null

  if (projectStateContinuityRelevant && sessionCovered && hasFreshValidationSnapshot && !samePatternStillPresent) {
    summaryLines.push('项目状态连续性治理已经被新的验证快照再次确认，可进入基线判断。')
  }
  else if (bodyContinuityRelevant && sessionCovered && hasFreshValidationSnapshot && !samePatternStillPresent) {
    summaryLines.push(
      bodyOnlyHold
        ? '身体连续性已经被新的验证快照再次确认，并明确处于身体独撑态：同一段 living segment 仍由身体线独自托住，但还不能把显形回接视为已经成立，可进入更谨慎的基线判断。'
        : fullCrossModalLock
          ? rendererRejoinSurface
            ? `身体连续性已经被新的验证快照再次确认，并明确处于跨模态重锁态（${rendererRejoinSurface} authority lock），身体线与显形权威仍稳定锁在同一段 living segment 上，可进入基线判断。`
            : '身体连续性已经被新的验证快照再次确认，并明确处于跨模态重锁态，身体线与显形权威仍稳定锁在同一段 living segment 上，可进入基线判断。'
          : rendererRejoinWithoutBody
            ? survivingVisibleLane === 'face+lipsync+voice-only'
              ? '身体连续性已经被新的验证快照再次确认，但当前仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线，不应把这次 quieter carry 直接采纳为长期基线。'
              : survivingVisibleLane === 'motion+lipsync+voice-only'
                ? '身体连续性已经被新的验证快照再次确认，但当前仍只有动作、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、face 还没有重新接回这条动作口型声音线，不应把这次 quieter carry 直接采纳为长期基线。'
                : survivingVisibleLane === 'face+lipsync-only'
                  ? '身体连续性已经被新的验证快照再次确认，但当前仍只有表情、口型这条 same-her 生命线与同一段 living segment 对齐，body、motion、voice 还没有重新接回这条表情口型线，不应把这次 quieter carry 直接采纳为长期基线。'
                  : survivingVisibleLane === 'motion+lipsync-only'
                    ? '身体连续性已经被新的验证快照再次确认，但当前仍只有动作、口型这条 same-her 生命线与同一段 living segment 对齐，body、face、voice 还没有重新接回这条动作口型线，不应把这次 quieter carry 直接采纳为长期基线。'
                    : rendererRejoinSurface
                      ? `身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（${rendererRejoinSurface} authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。`
                      : '身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。'
            : bodyContinuityRendererRejoin
              ? rendererRejoinSurface
                ? `身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（${rendererRejoinSurface} authority rejoin），可进入基线判断。`
                : '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态，可进入基线判断。'
              : '身体连续性已经被新的验证快照再次确认，可进入基线判断。',
    )
  }
  else if (continuityGovernanceRelevant && sessionCovered && hasFreshValidationSnapshot && !samePatternStillPresent) {
    summaryLines.push('same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。')
  }

  const relationshipCadenceGovernanceRelevant = input.repairSession.summaryLines.some(line =>
    line.includes('relationship cadence governance')
    || line.includes('companionship transition summary')
    || line.includes('companionship transition settle cadence'),
  )
  || callbackBoundedMeasuredReturn

  if (relationshipCadenceGovernanceRelevant && sessionCovered && hasFreshValidationSnapshot && !samePatternStillPresent) {
    summaryLines.push(
      callbackBoundedMeasuredReturn
        ? 'relationship cadence 治理已经被新的验证快照再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可进入更克制的关系节律基线判断。'
        : 'relationship cadence 治理已经被新的验证快照再次确认，可进入基线判断。',
    )
  }

  return {
    isClosed: sessionCovered && hasFreshValidationSnapshot && !samePatternStillPresent && prosodyAuthorityValidated !== false,
    sessionCovered,
    hasFreshValidationSnapshot,
    samePatternStillPresent,
    prosodyAuthorityRelevant,
    prosodyAuthorityValidated,
    bodyContinuityPhase,
    rendererRejoinSurfaceKey: input.repairSession.rendererRejoinSurfaceKey ?? null,
    ...(survivingVisibleLane ? { survivingVisibleLane } : {}),
    summaryLines,
  }
}
