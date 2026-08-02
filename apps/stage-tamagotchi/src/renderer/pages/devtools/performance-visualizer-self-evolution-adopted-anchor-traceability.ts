interface SelfEvolutionAdoptedAnchorLike {
  adoptedAt?: number
  snapshotCapturedAt: number
  candidateId?: string | null
  decisionTraceId: string | null
  activeThreadId?: string | null
  activePatternKey: string | null
  repairOwnerHint: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  [key: string]: unknown
}

interface SelfEvolutionPatternWorkflowLike {
  steps?: unknown[]
  validationChecklist?: unknown[]
}

interface SelfEvolutionPatternContextLike {
  currentCapturedAt?: number
  previousCapturedAt?: number
  side?: 'current' | 'previous'
}

function appendOptionalFact(
  lines: string[],
  key: string,
  value: string | number | null | undefined,
) {
  if (value != null && value !== '')
    lines.push(`${key}=${value}`)
}

export function buildSelfEvolutionAdoptedAnchorTraceability(input: {
  adoptedAnchor: SelfEvolutionAdoptedAnchorLike | null
  patternSummaryByKey: Record<string, string>
  workflowByPatternKey: Record<string, SelfEvolutionPatternWorkflowLike | undefined>
  patternContextByKey: Record<string, SelfEvolutionPatternContextLike | undefined>
}) {
  const anchor = input.adoptedAnchor
  const patternKey = anchor?.activePatternKey
  if (!anchor || !patternKey)
    return null

  const workflow = input.workflowByPatternKey[patternKey]
  const context = input.patternContextByKey[patternKey]
  const supportingLines = [
    `patternKey=${patternKey}`,
    `snapshotCapturedAt=${anchor.snapshotCapturedAt}`,
  ]

  appendOptionalFact(supportingLines, 'adoptedAt', anchor.adoptedAt)
  appendOptionalFact(supportingLines, 'candidateId', anchor.candidateId)
  appendOptionalFact(supportingLines, 'decisionTraceId', anchor.decisionTraceId)
  appendOptionalFact(supportingLines, 'activeThreadId', anchor.activeThreadId)
  appendOptionalFact(supportingLines, 'repairOwnerHint', anchor.repairOwnerHint)
  appendOptionalFact(supportingLines, 'bodyContinuityPhase', anchor.bodyContinuityPhase)
  appendOptionalFact(supportingLines, 'rendererRejoinSurfaceKey', anchor.rendererRejoinSurfaceKey)
  appendOptionalFact(supportingLines, 'survivingVisibleLane', anchor.survivingVisibleLane)

  return {
    patternKey,
    patternSummary: null,
    workflowHeadline: workflow
      ? `workflowSteps=${workflow.steps?.length ?? 0}; validationChecks=${workflow.validationChecklist?.length ?? 0}`
      : null,
    workflowContextLine: context
      ? [
          context.side ? `side=${context.side}` : null,
          context.previousCapturedAt != null ? `previousCapturedAt=${context.previousCapturedAt}` : null,
          context.currentCapturedAt != null ? `currentCapturedAt=${context.currentCapturedAt}` : null,
        ].filter((value): value is string => Boolean(value)).join('; ') || null
      : null,
    supportingLines,
  }
}
