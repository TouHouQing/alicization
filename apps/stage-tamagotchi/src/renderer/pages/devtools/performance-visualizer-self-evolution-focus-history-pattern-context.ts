import { formatSelfEvolutionWorkflowSideLabel } from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionFocusHistoryPattern {
  patternKey: string
  occurrenceCount: number
  summaryLine: string
  focusCardTransition: string
  traceEventTransition: string
  evidenceGained: string[]
  evidenceLost: string[]
  traceTargetsGained: string[]
  traceTargetsLost: string[]
  occurrences: Array<{
    currentCapturedAt: number
    previousCapturedAt: number
  }>
}

type SelfEvolutionBodyContinuityPhase
  = | 'body-only-hold'
    | 'body-carried-to-renderer-rejoin'
    | 'full-cross-modal-lock'
    | 'renderer-rejoin-without-body'
    | null

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

function readPatternKeyValue(patternKey: string, field: string) {
  const match = patternKey.match(new RegExp(`(?:^|\\|)${field}:([^|]+)`))
  return match?.[1] ?? null
}

function resolveBodyContinuityPhase(
  pattern: SelfEvolutionFocusHistoryPattern,
): SelfEvolutionBodyContinuityPhase {
  const phase = readPatternKeyValue(pattern.patternKey, 'phase')

  if (
    phase === 'body-only-hold'
    || phase === 'body-carried-to-renderer-rejoin'
    || phase === 'full-cross-modal-lock'
    || phase === 'renderer-rejoin-without-body'
  ) {
    return phase
  }

  if (pattern.summaryLine.includes('显形回接失身态'))
    return 'renderer-rejoin-without-body'
  if (pattern.summaryLine.includes('跨模态重锁态'))
    return 'full-cross-modal-lock'
  if (
    pattern.summaryLine.includes('身体独撑态')
    || pattern.summaryLine.includes('独自托住同一段 living segment')
  ) {
    return 'body-only-hold'
  }
  if (
    pattern.summaryLine.includes('身体承接态 ->')
    || pattern.summaryLine.includes('身体连续性承接 ->')
  ) {
    return 'body-carried-to-renderer-rejoin'
  }

  return null
}

function resolveSurvivingVisibleLane(
  pattern: SelfEvolutionFocusHistoryPattern,
): SelfEvolutionSurvivingVisibleLane {
  const lane = readPatternKeyValue(pattern.patternKey, 'lane')

  if (
    lane === 'face+lipsync-only'
    || lane === 'motion+lipsync-only'
    || lane === 'face+lipsync+voice-only'
    || lane === 'motion+lipsync+voice-only'
  ) {
    return lane
  }

  if (pattern.summaryLine.includes('当前仅剩表情、口型、声音维持同一段连续性'))
    return 'face+lipsync+voice-only'
  if (pattern.summaryLine.includes('当前仅剩动作、口型、声音维持同一段连续性'))
    return 'motion+lipsync+voice-only'
  if (pattern.summaryLine.includes('当前只有 face 和 lipsync 这条 identity-continuity 生命线'))
    return 'face+lipsync-only'
  if (pattern.summaryLine.includes('当前只有 motion 和 lipsync 这条 identity-continuity 生命线'))
    return 'motion+lipsync-only'

  return null
}

export function buildSelfEvolutionFocusHistoryPatternContext(input: {
  pattern: SelfEvolutionFocusHistoryPattern
  preferredSide: 'current' | 'previous'
}) {
  const occurrence = input.pattern.occurrences[0]
  if (!occurrence)
    return null

  const bodyContinuityPattern = input.pattern.patternKey.includes('signature:body-continuity')
  const bodyContinuityPhase = bodyContinuityPattern
    ? resolveBodyContinuityPhase(input.pattern)
    : null
  const survivingVisibleLane = bodyContinuityPattern
    ? resolveSurvivingVisibleLane(input.pattern)
    : null
  const summaryLine = bodyContinuityPattern
    ? bodyContinuityPhase === 'full-cross-modal-lock'
      ? `将身体连续性工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}，优先确认身体线与显形权威是否仍稳定锁在同一段 living segment 上。`
      : bodyContinuityPhase === 'renderer-rejoin-without-body'
        ? survivingVisibleLane === 'face+lipsync+voice-only'
          ? `将身体连续性工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}，优先确认当前是否仍只有表情、口型、声音这条 identity-continuity 生命线与同一段 living segment 对齐，以及为什么 body、motion 还没有重新接回这条表情口型声音线。`
          : survivingVisibleLane === 'motion+lipsync+voice-only'
            ? `将身体连续性工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}，优先确认当前是否仍只有动作、口型、声音这条 identity-continuity 生命线与同一段 living segment 对齐，以及为什么 body、face 还没有重新接回这条动作口型声音线。`
            : survivingVisibleLane === 'face+lipsync-only'
              ? `将身体连续性工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}，优先确认当前是否仍只有表情、口型这条 identity-continuity 生命线与同一段 living segment 对齐，以及为什么 body、motion、voice 还没有重新接回这条表情口型线。`
              : survivingVisibleLane === 'motion+lipsync-only'
                ? `将身体连续性工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}，优先确认当前是否仍只有动作、口型这条 identity-continuity 生命线与同一段 living segment 对齐，以及为什么 body、face、voice 还没有重新接回这条动作口型线。`
                : `将身体连续性工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}，优先确认为什么显形权威已经回接、但身体线没有继续托住同一段 living segment。`
        : bodyContinuityPhase === 'body-only-hold'
          ? `将身体连续性工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}，优先确认身体线是否仍在独自托住同一段 living segment。`
          : `将身体连续性工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}，优先确认身体线是否仍托住同一段 living segment。`
    : `将工作流应用到 ${new Date(occurrence.previousCapturedAt).toISOString()} -> ${new Date(occurrence.currentCapturedAt).toISOString()} 的${formatSelfEvolutionWorkflowSideLabel(input.preferredSide)}。`

  return {
    currentCapturedAt: occurrence.currentCapturedAt,
    previousCapturedAt: occurrence.previousCapturedAt,
    side: input.preferredSide,
    summaryLine,
  }
}
